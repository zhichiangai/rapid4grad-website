import { NextRequest, NextResponse } from "next/server";
import {
  EMAIL_VERIFIED_SESSION_COOKIE,
  verifyEmailSession,
} from "@/lib/email-verification/session";
import { createAdminClient, createClient } from "@/lib/supabase/server";

type AiUsageRequest = {
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
const BODY_LIMIT_BYTES = 24 * 1024;
const ALLOWED_STAGES = new Set(["master_1", "master_2", "master_3_plus", "phd", "part_time"]);
const ALLOWED_CONTEXTS = new Set(["one_on_one", "group_meeting", "defense_rehearsal", "submission_check", "draft_revision", "other"]);
const ALLOWED_AIS = new Set(["chatgpt", "claude", "gemini", "grok"]);
const ALLOWED_INSTRUCTIONS = new Set(["advisor_questions", "logic_check", "presentation_revision", "english_polish"]);
const ALLOWED_PAIN_POINTS = new Set(["find_gap", "logic_check", "advisor_simulation", "presentation_revision", "english_polish", "figure_check", "other"]);

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

function serverError(context: string, code?: string) {
  console.error(`[ai-usage] ${context}`, { code });
  return NextResponse.json(
    { status: "error", message: "目前無法完成額度檢查，請稍後再試。" },
    { status: 500 },
  );
}

async function parsePayload(request: NextRequest): Promise<AiUsageRequest | null> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > BODY_LIMIT_BYTES) return null;
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > BODY_LIMIT_BYTES) return null;
  try {
    return JSON.parse(raw) as AiUsageRequest;
  } catch {
    return null;
  }
}

function validShortArray(value: unknown, allowed: Set<string>, maxItems: number) {
  return (
    Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => typeof item === "string" && allowed.has(item))
  );
}

function isValidPayload(payload: AiUsageRequest) {
  const prefs = payload.advisorPrefs;
  return (
    typeof payload.studentStage === "string" &&
    ALLOWED_STAGES.has(payload.studentStage) &&
    typeof payload.meetingContext === "string" &&
    ALLOWED_CONTEXTS.has(payload.meetingContext) &&
    typeof payload.selectedAi === "string" &&
    ALLOWED_AIS.has(payload.selectedAi) &&
    validShortArray(payload.instructionTypes, ALLOWED_INSTRUCTIONS, 4) &&
    (payload.instructionTypes?.length ?? 0) > 0 &&
    validShortArray(payload.painPoints ?? [], ALLOWED_PAIN_POINTS, 7) &&
    (!payload.generatedPrompt || payload.generatedPrompt.length <= 20_000) &&
    (!prefs?.preferredStyle || prefs.preferredStyle.length <= 500) &&
    (!prefs?.customNote || prefs.customNote.length <= 1000) &&
    (!prefs?.frequentQuestions ||
      (prefs.frequentQuestions.length <= 20 &&
        prefs.frequentQuestions.every((item) => item.length <= 500)))
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
  const payload = await parsePayload(request);
  if (!payload || !isValidPayload(payload)) return badRequest("無效的 AI 指令參數。");

  const authenticatedUser = await getAuthenticatedUser();
  const supabase = createAdminClient();
  const userId = authenticatedUser?.id ?? null;
  const verifiedSession = await verifyEmailSession(
    supabase,
    request.cookies.get(EMAIL_VERIFIED_SESSION_COOKIE)?.value,
  );
  const email = authenticatedUser?.email?.trim().toLowerCase() || verifiedSession?.email || "";

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
          return serverError("Paid usage insert failed", usageError.code);
        }

        return NextResponse.json({
          status: "allowed",
          paidAccess: true,
          message: "付費工具權限檢查通過。",
        });
      }
    } catch (error) {
      console.error("[ai-usage] Paid access check failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
      return serverError("Paid access check unavailable");
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
      return serverError("Anonymous usage insert failed", usageError.code);
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
    return serverError("Quota read failed", quotaReadError.code);
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
    return serverError("Quota write failed", quotaWriteError.code);
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
    return serverError("Verified usage insert failed", usageError.code);
  }

  return NextResponse.json({
    status: "allowed",
    remainingDaily: Math.max(dailyLimit - nextDailyCount, 0),
    remainingTotal: Math.max(totalLimit - nextTotalCount, 0),
    unlockedByAdmin: isUnlockedByAdmin,
    message: "免費額度檢查通過。",
  });
}
