"use client";

import { useState } from "react";
import { buildPrompt } from "@/lib/prompt-builder/builder";
import type {
  AdvisorPrefs,
  AiModel,
  InstructionType,
  MeetingContext,
  PainPoint,
  PromptParams,
  PromptTemplate,
  StudentStage,
} from "@/lib/prompt-builder/types";
import { AdvisorPrefsInput } from "./AdvisorPrefsInput";
import { AiModelSelector } from "./AiModelSelector";
import { GeneratedPromptDisplay } from "./GeneratedPromptDisplay";
import { InstructionTypeSelector } from "./InstructionTypeSelector";
import { MeetingContextSelector } from "./MeetingContextSelector";
import { PainPointSelector } from "./PainPointSelector";
import { StudentStageSelector } from "./StudentStageSelector";
import { UsageGateModal } from "./UsageGateModal";

type UsageStatus =
  | "allowed"
  | "verification_required"
  | "quota_exceeded"
  | "error";

interface AiCommandContainerProps {
  initialAnonymousTrialUsed: boolean;
  isDashboardRoute?: boolean;
  activePromptTemplates?: PromptTemplate[];
  promptTemplateLoadError?: string;
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function AiCommandContainer({
  initialAnonymousTrialUsed,
  isDashboardRoute = false,
  activePromptTemplates = [],
  promptTemplateLoadError,
}: AiCommandContainerProps) {
  const [studentStage, setStudentStage] = useState<StudentStage>("master_2");
  const [meetingContext, setMeetingContext] =
    useState<MeetingContext>("one_on_one");
  const [painPoints, setPainPoints] = useState<PainPoint[]>([
    "logic_check",
    "advisor_simulation",
  ]);
  const [selectedAi, setSelectedAi] = useState<AiModel>("chatgpt");
  const [instructionTypes, setInstructionTypes] = useState<InstructionType[]>([
    "advisor_questions",
    "logic_check",
  ]);
  const [frequentQuestions, setFrequentQuestions] = useState("");
  const [preferredStyle, setPreferredStyle] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [anonymousTrialUsed, setAnonymousTrialUsed] = useState(
    initialAnonymousTrialUsed,
  );
  const [usageGate, setUsageGate] = useState<{
    isOpen: boolean;
    reason: "verification_required" | "quota_exceeded" | null;
    message: string;
  }>({
    isOpen: false,
    reason: null,
    message: "",
  });

  const buildParams = (): PromptParams => {
    const advisorPrefs: AdvisorPrefs = {
      frequentQuestions: splitLines(frequentQuestions),
      preferredStyle: preferredStyle.trim() || undefined,
      customNote: customNote.trim() || undefined,
    };

    return {
      studentStage,
      meetingContext,
      painPoints,
      selectedAi,
      instructionTypes,
      advisorPrefs,
    };
  };

  const generateWithUsageCheck = async (email?: string) => {
    if (painPoints.length === 0) {
      setError("請至少選擇一個核心痛點 / 需求。");
      return;
    }

    if (instructionTypes.length === 0) {
      setError("請至少選擇一個 AI 指令方向。");
      return;
    }

    const params = buildParams();
    const prompt = buildPrompt(params, activePromptTemplates);
    const normalizedEmail = email?.trim().toLowerCase() || verifiedEmail;

    if (!normalizedEmail && anonymousTrialUsed) {
      setUsageGate({
        isOpen: true,
        reason: "verification_required",
        message: "免費試用已使用 1 次，請輸入 Email 驗證後繼續使用。",
      });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/ai-usage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail || undefined,
          isAnonymousTrial: !normalizedEmail,
          studentStage: params.studentStage,
          meetingContext: params.meetingContext,
          painPoints: params.painPoints,
          selectedAi: params.selectedAi,
          instructionTypes: params.instructionTypes,
          advisorPrefs: params.advisorPrefs,
          generatedPrompt: prompt,
        }),
      });

      const result = (await response.json()) as {
        status?: UsageStatus;
        message?: string;
        isAnonymousTrial?: boolean;
      };

      if (result.status === "allowed") {
        if (normalizedEmail) {
          setVerifiedEmail(normalizedEmail);
        } else if (result.isAnonymousTrial) {
          setAnonymousTrialUsed(true);
        }
        setGeneratedPrompt(prompt);
        setError(null);
        return;
      }

      if (
        result.status === "verification_required" ||
        result.status === "quota_exceeded"
      ) {
        setUsageGate({
          isOpen: true,
          reason: result.status,
          message: result.message || "",
        });
        return;
      }

      setError(result.message || "額度檢查失敗，請稍後再試。");
    } catch {
      setError("無法連線到額度檢查服務，請稍後再試。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerate = () => {
    void generateWithUsageCheck();
  };

  const handleUsageVerified = (email: string) => {
    setVerifiedEmail(email);
    setUsageGate({
      isOpen: false,
      reason: null,
      message: "",
    });
    void generateWithUsageCheck(email);
  };

  return (
    <section className="bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.20),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 pb-12 text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-6 shadow-2xl shadow-blue-950/20 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">
            RAPID AI COMMAND
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            設定你的研究情境
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            第一版不需要在 RAPID 上傳 PDF，也不呼叫後端 LLM。你只需要選擇情境，系統會在前端產生可貼到外部 AI 的學術指令。
          </p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-xs leading-5 text-slate-400">
            {promptTemplateLoadError ? (
              <span>
                CMS 模板讀取失敗，將使用本地 fallback 模板：
                {promptTemplateLoadError}
              </span>
            ) : activePromptTemplates.length ? (
              <span>
                已載入 {activePromptTemplates.length} 組 active CMS Prompt
                Templates；後台修改會影響此工具生成結果。
              </span>
            ) : (
              <span>
                尚未載入 active CMS Prompt Templates，目前將使用本地 fallback
                模板。
              </span>
            )}
          </div>

          <div className="mt-7 space-y-7">
            <StudentStageSelector
              value={studentStage}
              onChange={setStudentStage}
            />
            <MeetingContextSelector
              value={meetingContext}
              onChange={setMeetingContext}
            />
            <PainPointSelector value={painPoints} onChange={setPainPoints} />
            <AiModelSelector value={selectedAi} onChange={setSelectedAi} />
            <InstructionTypeSelector
              value={instructionTypes}
              onChange={setInstructionTypes}
            />
            <AdvisorPrefsInput
              frequentQuestions={frequentQuestions}
              preferredStyle={preferredStyle}
              customNote={customNote}
              onFrequentQuestionsChange={setFrequentQuestions}
              onPreferredStyleChange={setPreferredStyle}
              onCustomNoteChange={setCustomNote}
            />

            {error ? (
              <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-blue-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "檢查免費額度中..." : "產生 AI 指令"}
            </button>
          </div>
        </div>

        <GeneratedPromptDisplay prompt={generatedPrompt} />
      </div>

      {!isDashboardRoute ? (
        <div className="mx-auto mt-6 w-full max-w-6xl rounded-[2rem] border border-blue-300/15 bg-blue-500/10 p-5 text-sm leading-6 text-blue-50">
          免費試用入口：第一次可免登入生成。若你已購買課程，請使用 Google 登入後進入 Dashboard，即可使用付費權限。
        </div>
      ) : null}

      <UsageGateModal
        isOpen={usageGate.isOpen}
        reason={usageGate.reason}
        message={usageGate.message}
        onVerified={handleUsageVerified}
        onClose={() =>
          setUsageGate({
            isOpen: false,
            reason: null,
            message: "",
          })
        }
      />
    </section>
  );
}
