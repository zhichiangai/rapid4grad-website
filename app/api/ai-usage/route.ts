import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

type AiUsageRequest = {
  email?: string;
  isAnonymousTrial?: boolean;
  studentStage?: string;
  meetingContext?: string;
  painPoints?: string[];
  selectedAi?: string;
  instructionTypes?: string[];
  advisorPrefs?: {
    frequentQuestions?: string[];
    preferredStyle?: string;
    customNote?: string;
  };
  generatedPrompt?: string;
};

const ANONYMOUS_TRIAL_COOKIE = "rapid_anon_ai_trial_used";

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() || "";
}

function isNewDailyWindow(lastResetAt?: string | null) {
  if (!lastResetAt) {
    return true;
  }

  const lastReset = new Date(lastResetAt);
  const now = new Date();

  return (
    lastReset.getFullYear() !== now.getFullYear() ||
    lastReset.getMonth() !== now.getMonth() ||
    lastReset.getDate() !== now.getDate()
  );
}

function badRequest(message: string) {
  return NextResponse.json(
    {
      status: "error",
      message,
    },
    { status: 400 },
  );
}

function buildUsagePayload({
  payload,
  email,
  userId = null,
  emailVerified,
  isAnonymousTrial,
  isFreeUser,
}: {
  payload: AiUsageRequest;
  email: string | null;
  userId?: string | null;
  emailVerified: boolean;
  isAnonymousTrial: boolean;
  isFreeUser: boolean;
}) {
  return {
    user_id: userId,
    email,
    email_verified: emailVerified,
    is_anonymous_trial: isAnonymousTrial,
    is_free_user: isFreeUser,
    student_stage: payload.studentStage,
    meeting_context: payload.meetingContext,
    pain_points: payload.painPoints ?? [],
    selected_ai: payload.selectedAi,
    instruction_types: payload.instructionTypes ?? [],
    advisor_prefs: {
      frequent_questions: payload.advisorPrefs?.frequentQuestions ?? [],
      preferred_style: payload.advisorPrefs?.preferredStyle ?? null,
      custom_note: payload.advisorPrefs?.customNote ?? null,
    },
    generated_prompt: payload.generatedPrompt ?? null,
  };
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

async function hasPaidToolAccess({
  supabase,
  userId,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  userId: string;
}) {
  const now = new Date().toISOString();

  const [{ data: profile, error: profileError }, { data: access, error: accessError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("is_paid,course_expires_at")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("course_access")
        .select("id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .gt("expires_at", now)
        .limit(1)
        .maybeSingle(),
    ]);

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (accessError) {
    throw new Error(accessError.message);
  }

  const profileAccess =
    profile?.is_paid === true &&
    Boolean(profile.course_expires_at) &&
    new Date(profile.course_expires_at as string).getTime() > Date.now();

  return profileAccess || Boolean(access);
}

export async function POST(request: NextRequest) {
  let payload: AiUsageRequest;

  try {
    payload = (await request.json()) as AiUsageRequest;
  } catch {
    return badRequest("Invalid JSON payload.");
  }

  if (
    !payload.studentStage ||
    !payload.meetingContext ||
    !payload.selectedAi ||
    !payload.instructionTypes?.length
  ) {
    return badRequest("Missing AI command usage parameters.");
  }

  const authenticatedUser = await getAuthenticatedUser();
  const email = normalizeEmail(payload.email || authenticatedUser?.email);
  const supabase = createAdminClient();
  const userId = authenticatedUser?.id ?? null;

  if (userId) {
    try {
      const isPaidUser = await hasPaidToolAccess({ supabase, userId });

      if (isPaidUser) {
        const { error: usageError } = await supabase
          .from("ai_instruction_usages")
          .insert(
            buildUsagePayload({
              payload,
              email,
              userId,
              emailVerified: true,
              isAnonymousTrial: false,
              isFreeUser: false,
            }),
          );

        if (usageError) {
          return NextResponse.json(
            { status: "error", message: usageError.message },
            { status: 500 },
          );
        }

        return NextResponse.json({
          status: "allowed",
          paidAccess: true,
          message: "付費工具權限檢查通過。",
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Paid access check failed.";

      return NextResponse.json(
        { status: "error", message },
        { status: 500 },
      );
    }
  }

  if (payload.isAnonymousTrial && !email) {
    const hasUsedAnonymousTrial =
      request.cookies.get(ANONYMOUS_TRIAL_COOKIE)?.value === "true";

    if (hasUsedAnonymousTrial) {
      return NextResponse.json(
        {
          status: "verification_required",
          message: "免費試用已使用 1 次，請輸入 Email 驗證後繼續使用。",
        },
        { status: 403 },
      );
    }

    const { error: usageError } = await supabase
      .from("ai_instruction_usages")
      .insert(
        buildUsagePayload({
          payload,
          email: null,
          emailVerified: false,
          isAnonymousTrial: true,
          isFreeUser: true,
        }),
      );

    if (usageError) {
      return NextResponse.json(
        { status: "error", message: usageError.message },
        { status: 500 },
      );
    }

    const response = NextResponse.json({
      status: "allowed",
      isAnonymousTrial: true,
      remainingDaily: 0,
      remainingTotal: 0,
      message: "匿名免費試用已核准。",
    });

    response.cookies.set(ANONYMOUS_TRIAL_COOKIE, "true", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });

    return response;
  }

  if (!email) {
    return NextResponse.json(
      {
        status: "verification_required",
        message: "請輸入 Email 驗證後繼續使用。",
      },
      { status: 403 },
    );
  }

  const { data: existingQuota, error: quotaReadError } = await supabase
    .from("free_usage_quotas")
    .select(
      "id,email,daily_count,total_count,daily_limit,total_limit,unlocked_by_admin,last_reset_at",
    )
    .eq("email", email)
    .maybeSingle();

  if (quotaReadError) {
    return NextResponse.json(
      { status: "error", message: quotaReadError.message },
      { status: 500 },
    );
  }

  const now = new Date();
  const shouldResetDaily = isNewDailyWindow(existingQuota?.last_reset_at);
  const dailyCount = shouldResetDaily ? 0 : (existingQuota?.daily_count ?? 0);
  const totalCount = existingQuota?.total_count ?? 0;
  const dailyLimit = existingQuota?.daily_limit ?? 2;
  const totalLimit = existingQuota?.total_limit ?? 3;
  const isUnlockedByAdmin = existingQuota?.unlocked_by_admin === true;

  if (!isUnlockedByAdmin && dailyCount >= dailyLimit) {
    return NextResponse.json(
      {
        status: "quota_exceeded",
        reason: "daily_limit",
        message: "今日免費生成次數已用完，請明天再試或升級課程方案。",
      },
      { status: 429 },
    );
  }

  if (!isUnlockedByAdmin && totalCount >= totalLimit) {
    return NextResponse.json(
      {
        status: "quota_exceeded",
        reason: "total_limit",
        message: "免費生成總次數已用完，請升級課程方案繼續使用。",
      },
      { status: 429 },
    );
  }

  const nextDailyCount = dailyCount + 1;
  const nextTotalCount = totalCount + 1;

  const quotaPayload = {
    email,
    daily_count: nextDailyCount,
    total_count: nextTotalCount,
    last_used_at: now.toISOString(),
    last_reset_at: shouldResetDaily
      ? now.toISOString()
      : (existingQuota?.last_reset_at ?? now.toISOString()),
  };

  const quotaQuery = existingQuota
    ? supabase
        .from("free_usage_quotas")
        .update(quotaPayload)
        .eq("id", existingQuota.id)
    : supabase.from("free_usage_quotas").insert(quotaPayload);

  const { error: quotaWriteError } = await quotaQuery;

  if (quotaWriteError) {
    return NextResponse.json(
      { status: "error", message: quotaWriteError.message },
      { status: 500 },
    );
  }

  const { error: usageError } = await supabase
    .from("ai_instruction_usages")
    .insert(
      buildUsagePayload({
        payload: { ...payload, isAnonymousTrial: false },
        email,
        userId,
        emailVerified: true,
        isAnonymousTrial: false,
        isFreeUser: true,
      }),
    );

  if (usageError) {
    return NextResponse.json(
      { status: "error", message: usageError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    status: "allowed",
    remainingDaily: Math.max(dailyLimit - nextDailyCount, 0),
    remainingTotal: Math.max(totalLimit - nextTotalCount, 0),
    unlockedByAdmin: isUnlockedByAdmin,
    message: "免費額度檢查通過。",
  });
}
