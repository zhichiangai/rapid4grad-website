import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

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

function buildUsagePayload(payload: AiUsageRequest, email: string | null) {
  return {
    email,
    email_verified: Boolean(email),
    is_anonymous_trial: payload.isAnonymousTrial === true && !email,
    is_free_user: true,
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

  const email = normalizeEmail(payload.email);
  const supabase = createAdminClient();

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
      .insert(buildUsagePayload(payload, null));

    if (usageError) {
      return NextResponse.json(
        { status: "error", message: usageError.message },
        { status: 500 },
      );
    }

    const response = NextResponse.json({
      status: "allowed",
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
    .insert(buildUsagePayload({ ...payload, isAnonymousTrial: false }, email));

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
