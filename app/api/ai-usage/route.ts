import { NextRequest, NextResponse } from "next/server";
import {
  EMAIL_VERIFIED_SESSION_COOKIE,
  verifyEmailSession,
} from "@/lib/email-verification/session";
import { createAdminClient } from "@/lib/supabase/server";
import { getActiveApiUser } from "@/lib/auth/authorization";

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

const ANONYMOUS_TRIAL_COOKIE = "rapid_anon_ai_trial_count";
const ANONYMOUS_TRIAL_LIMIT = 20;
const BODY_LIMIT_BYTES = 24 * 1024;
const ALLOWED_STAGES = new Set(["master_1", "master_2", "master_3_plus", "phd", "part_time"]);
const ALLOWED_CONTEXTS = new Set(["one_on_one", "group_meeting", "defense_rehearsal", "submission_check", "draft_revision", "other"]);
const ALLOWED_AIS = new Set(["chatgpt", "claude", "gemini", "grok"]);
const ALLOWED_INSTRUCTIONS = new Set(["advisor_questions", "logic_check", "presentation_revision", "english_polish"]);
const ALLOWED_PAIN_POINTS = new Set(["find_gap", "logic_check", "advisor_simulation", "presentation_revision", "english_polish", "figure_check", "other"]);

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
  isAnonymousTrial,
}: {
  payload: AiUsageRequest;
  email: string | null;
  userId?: string | null;
  isAnonymousTrial: boolean;
}) {
  return {
    user_id: userId,
    email,
    is_anonymous_trial: isAnonymousTrial,
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

function getAnonymousTrialCount(value?: string) {
  const count = Number.parseInt(value ?? "0", 10);
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}

export async function POST(request: NextRequest) {
  const payload = await parsePayload(request);
  if (!payload || !isValidPayload(payload)) return badRequest("無效的 AI 指令參數。");

  const auth = await getActiveApiUser();
  let authenticatedUser: { id: string; email?: string } | null = null;
  if ("response" in auth && auth.response) {
    if (auth.response.status === 403) return auth.response;
  } else {
    authenticatedUser = auth.context.user;
  }
  const supabase = createAdminClient();
  const userId = authenticatedUser?.id ?? null;
  const verifiedSession = await verifyEmailSession(
    supabase,
    request.cookies.get(EMAIL_VERIFIED_SESSION_COOKIE)?.value,
  );
  const email =
    authenticatedUser?.email?.trim().toLowerCase() || verifiedSession?.email || "";

  // Google sign-in or a completed Email verification unlocks this local Prompt Builder.
  // This tool only builds a string in the browser and is intentionally separate from paid products.
  if (userId || verifiedSession) {
    const { error: usageError } = await supabase
      .from("ai_instruction_usages")
      .insert(
        buildUsagePayload({
          payload,
          email,
          userId,
          isAnonymousTrial: false,
        }),
      );

    if (usageError) {
      return serverError("Verified usage insert failed", usageError.code);
    }

    return NextResponse.json({
      status: "allowed",
      emailVerified: true,
      message: "免費 AI 指令產生器已解鎖。",
    });
  }

  if (payload.isAnonymousTrial && !email) {
    const anonymousTrialCount = getAnonymousTrialCount(
      request.cookies.get(ANONYMOUS_TRIAL_COOKIE)?.value,
    );

    if (anonymousTrialCount >= ANONYMOUS_TRIAL_LIMIT) {
      return NextResponse.json(
        {
          status: "verification_required",
          message: "已完成 20 次匿名試用，請完成 Email 驗證後繼續不限次使用。",
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
          isAnonymousTrial: true,
        }),
      );

    if (usageError) {
      return serverError("Anonymous usage insert failed", usageError.code);
    }

    const response = NextResponse.json({
      status: "allowed",
      isAnonymousTrial: true,
      remainingAnonymous: Math.max(
        ANONYMOUS_TRIAL_LIMIT - anonymousTrialCount - 1,
        0,
      ),
      message: "匿名免費試用已核准。",
    });

    response.cookies.set(
      ANONYMOUS_TRIAL_COOKIE,
      String(anonymousTrialCount + 1),
      {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      },
    );

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

  return NextResponse.json(
    {
      status: "verification_required",
      message: "請完成 Email 驗證後繼續不限次使用。",
    },
    { status: 403 },
  );
}
