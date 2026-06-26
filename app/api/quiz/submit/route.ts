import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/server";
import type { QuizOptionValue } from "@/lib/quiz/questions";
import type { RiskLevel } from "@/lib/quiz/scorer";

type QuizAnswers = Partial<Record<`q${1 | 2 | 3 | 4 | 5 | 6 | 7}`, unknown>>;

interface QuizSubmitPayload {
  leadId?: unknown;
  email?: unknown;
  answers?: QuizAnswers;
  score?: unknown;
  riskLevel?: unknown;
  tags?: unknown;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RISK_LEVELS = new Set<RiskLevel>(["low", "medium", "high"]);
const QUIZ_VALUES = new Set<QuizOptionValue>(["A", "B", "C", "D"]);

const riskLabels: Record<RiskLevel, string> = {
  low: "低風險",
  medium: "中風險",
  high: "高風險",
};

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
}

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

function buildQuizResultEmail({
  riskLevel,
  score,
  tags,
}: {
  riskLevel: RiskLevel;
  score: number;
  tags: string[];
}) {
  const guideUrl = `${getSiteUrl()}/guide?source=quiz_result_email&risk=${riskLevel}`;
  const tagText = tags.length ? tags.join("、") : "尚未判定主要卡點";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #020617; color: #e2e8f0; padding: 32px;">
      <div style="max-width: 640px; margin: 0 auto; background: #0f172a; border: 1px solid rgba(148, 163, 184, 0.18); border-radius: 24px; padding: 28px;">
        <p style="font-size: 12px; letter-spacing: 0.18em; color: #93c5fd; font-weight: 700;">RAPID4GRAD</p>
        <h1 style="font-size: 28px; line-height: 1.3; color: #ffffff; margin: 16px 0;">你的研究生畢業狀態檢查報告</h1>
        <p style="line-height: 1.8; color: #cbd5e1;">你剛完成 7 題畢業狀態檢查。這不是用來恐嚇你的分數，而是幫你看見目前最需要優先處理的研究卡點。</p>
        <div style="margin: 24px 0; padding: 18px; border-radius: 18px; background: rgba(37, 99, 235, 0.14); border: 1px solid rgba(147, 197, 253, 0.24);">
          <p style="margin: 0; color: #bfdbfe;">風險等級</p>
          <p style="font-size: 24px; font-weight: 700; margin: 8px 0 0; color: #ffffff;">${riskLabels[riskLevel]}</p>
          <p style="margin: 8px 0 0; color: #cbd5e1;">分數：${score}</p>
          <p style="margin: 8px 0 0; color: #cbd5e1;">主要卡點：${tagText}</p>
        </div>
        <p style="line-height: 1.8; color: #cbd5e1;">下一步建議你閱讀網頁版《研究生畢業避坑指南》，先找出本週最該補的一個洞。</p>
        <a href="${guideUrl}" style="display: inline-block; margin-top: 18px; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 20px; border-radius: 16px; font-weight: 700;">閱讀研究生畢業避坑指南</a>
        <p style="margin-top: 28px; font-size: 12px; line-height: 1.7; color: #64748b;">RAPID4GRAD 會協助你把文獻、Meeting、簡報、AI 工具與時間方向拆成可執行的研究流程。</p>
      </div>
    </div>
  `;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isQuizValue(value: unknown): value is QuizOptionValue {
  return typeof value === "string" && QUIZ_VALUES.has(value as QuizOptionValue);
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return null;

  const tags = value.filter((tag): tag is string => typeof tag === "string");
  return tags.length === value.length ? tags : null;
}

export async function POST(request: NextRequest) {
  let payload: QuizSubmitPayload;

  try {
    payload = (await request.json()) as QuizSubmitPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const leadId = typeof payload.leadId === "string" ? payload.leadId : "";
  const email =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const answers = payload.answers ?? {};
  const score = payload.score;
  const riskLevel = payload.riskLevel;
  const tags = normalizeTags(payload.tags);

  if (!isUuid(leadId)) {
    return NextResponse.json(
      { error: "Valid leadId is required." },
      { status: 400 },
    );
  }

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: "Valid email is required." },
      { status: 400 },
    );
  }

  if (typeof score !== "number" || !Number.isInteger(score) || score < 0) {
    return NextResponse.json(
      { error: "Valid score is required." },
      { status: 400 },
    );
  }

  if (typeof riskLevel !== "string" || !RISK_LEVELS.has(riskLevel as RiskLevel)) {
    return NextResponse.json(
      { error: "Valid riskLevel is required." },
      { status: 400 },
    );
  }

  const q1 = answers.q1;
  const q2 = answers.q2;
  const q3 = answers.q3;
  const q4 = answers.q4;
  const q5 = answers.q5;
  const q6 = answers.q6;
  const q7 = answers.q7;

  if (
    !isQuizValue(q1) ||
    !isQuizValue(q2) ||
    !isQuizValue(q3) ||
    !isQuizValue(q4) ||
    !isQuizValue(q5) ||
    !isQuizValue(q6) ||
    !isQuizValue(q7)
  ) {
    return NextResponse.json(
      { error: "All seven quiz answers are required." },
      { status: 400 },
    );
  }

  if (!tags) {
    return NextResponse.json(
      { error: "Valid tags array is required." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { error: insertError } = await supabase.from("quiz_answers").insert({
    lead_id: leadId,
    q1,
    q2,
    q3,
    q4,
    q5,
    q6,
    q7,
    total_score: score,
    risk_level: riskLevel,
    tags,
  });

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 },
    );
  }

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      quiz_result: riskLevel,
      quiz_score: score,
      main_tags: tags,
    })
    .eq("id", leadId)
    .eq("email", email);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  const resend = getResendClient();
  let emailSent = false;

  if (resend) {
    const { error: emailError } = await resend.emails.send({
      from:
        process.env.RESEND_FROM_EMAIL ||
        "RAPID4GRAD <onboarding@resend.dev>",
      to: email,
      subject: "你的研究生畢業狀態檢查報告與避坑指南",
      html: buildQuizResultEmail({
        riskLevel: riskLevel as RiskLevel,
        score,
        tags,
      }),
    });

    if (emailError) {
      return NextResponse.json(
        {
          error: "Quiz result saved, but email delivery failed.",
          emailError,
        },
        { status: 502 },
      );
    }

    emailSent = true;
  }

  return NextResponse.json({ success: true, emailSent });
}
