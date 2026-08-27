"use client";

import { useEffect, useState } from "react";
import { buildPrompt, getRecommendedAi } from "@/lib/prompt-builder/builder";
import type { AdvisorPrefs, AiModel, MaterialType, PromptParams, PromptTemplate, ResearchConcern, ResearchTask, StudentStage } from "@/lib/prompt-builder/types";
import { AdvisorPrefsInput } from "./AdvisorPrefsInput";
import { AiModelSelector } from "./AiModelSelector";
import { GeneratedPromptDisplay } from "./GeneratedPromptDisplay";
import { MaterialTypeSelector } from "./MaterialTypeSelector";
import { ResearchConcernSelector } from "./ResearchConcernSelector";
import { ResearchTaskSelector } from "./ResearchTaskSelector";
import { UsageGateModal } from "./UsageGateModal";
import { CONCERN_TO_PAIN_POINTS, TASK_PRESETS } from "./options";
import { AI_DISPLAY_NAMES, STAGE_LABELS, TASK_LABELS } from "@/lib/prompt-builder/templates";

type UsageStatus = "allowed" | "verification_required" | "error";

interface AiCommandContainerProps {
  isDashboardRoute?: boolean;
  activePromptTemplates?: PromptTemplate[];
  promptTemplateLoadError?: string;
  previewMode?: boolean;
}

function splitLines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

const BENEFIT_LABELS: Record<string, string> = {
  find_gap: "找出研究缺口與 Novelty 問題",
  logic_check: "檢查研究邏輯與論證漏洞",
  advisor_simulation: "模擬教授可能追問的問題",
  presentation_revision: "改善簡報結構與研究故事線",
  english_polish: "改善學術英文表達",
  figure_check: "檢查圖表是否真的支撐結論",
  other: "整理其他研究需求",
};

export function AiCommandContainer({ isDashboardRoute = false, activePromptTemplates = [], promptTemplateLoadError, previewMode = false }: AiCommandContainerProps) {
  const [researchTask, setResearchTask] = useState<ResearchTask | null>(null);
  const [materialType, setMaterialType] = useState<MaterialType | null>("slides");
  const [concerns, setConcerns] = useState<ResearchConcern[]>([]);
  const [studentStage, setStudentStage] = useState<StudentStage>("master_2");
  const [selectedAi, setSelectedAi] = useState<AiModel>("chatgpt");
  const [isAiManuallySelected, setIsAiManuallySelected] = useState(false);
  const [frequentQuestions, setFrequentQuestions] = useState("");
  const [preferredStyle, setPreferredStyle] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasVerifiedEmailSession, setHasVerifiedEmailSession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usageGate, setUsageGate] = useState({ isOpen: false, message: "" });

  const preset = researchTask ? TASK_PRESETS[researchTask] : null;
  useEffect(() => {
    if (researchTask === "draft") setMaterialType("draft");
    if (researchTask === "submission") setMaterialType("draft");
    if (researchTask && ["presentation", "meeting", "defense"].includes(researchTask)) setMaterialType("slides");
    if (researchTask && !isAiManuallySelected) setSelectedAi(getRecommendedAi(researchTask, materialType ?? "slides"));
  }, [researchTask, materialType, isAiManuallySelected]);

  const effectivePainPoints = preset
    ? Array.from(new Set([...preset.painPoints, ...concerns.flatMap((concern) => CONCERN_TO_PAIN_POINTS[concern])]))
    : [];
  const effectiveInstructionTypes = preset?.instructionTypes ?? [];

  const buildParams = (): PromptParams => {
    const advisorPrefs: AdvisorPrefs = {
      frequentQuestions: splitLines(frequentQuestions),
      preferredStyle: preferredStyle.trim() || undefined,
      customNote: customNote.trim() || undefined,
    };
    return {
      studentStage,
      researchTask: researchTask ?? "other",
      materialType: materialType ?? "unknown",
      meetingContext: preset?.meetingContext ?? "other",
      painPoints: effectivePainPoints,
      selectedAi,
      instructionTypes: effectiveInstructionTypes,
      advisorPrefs,
    };
  };

  const generateWithUsageCheck = async (verifiedSession = false) => {
    if (!researchTask || !materialType) {
      setError("請先選擇研究任務與研究材料。");
      return;
    }
    const params = buildParams();
    const prompt = buildPrompt(params, activePromptTemplates);
    if (previewMode) {
      setGeneratedPrompt(prompt);
      setError(null);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/ai-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isAnonymousTrial: !(verifiedSession || hasVerifiedEmailSession),
          researchTask: params.researchTask,
          materialType: params.materialType,
          concerns,
          studentStage: params.studentStage,
          meetingContext: params.meetingContext,
          painPoints: params.painPoints,
          selectedAi: params.selectedAi,
          instructionTypes: params.instructionTypes,
          advisorPrefs: params.advisorPrefs,
          generatedPrompt: prompt,
        }),
      });
      const result = (await response.json()) as { status?: UsageStatus; message?: string };
      if (result.status === "allowed") {
        setGeneratedPrompt(prompt);
        return;
      }
      if (result.status === "verification_required") {
        setUsageGate({ isOpen: true, message: result.message ?? "" });
        return;
      }
      setError(result.message ?? "目前無法產生研究指令，請稍後再試。");
    } catch {
      setError("目前無法連線，請稍後再試。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = effectivePainPoints.map((point) => BENEFIT_LABELS[point]).filter(Boolean);
  const taskTitle = researchTask ? `${TASK_LABELS[researchTask]}指令已完成` : null;
  const recommendation = getRecommendedAi(researchTask ?? "other", materialType ?? "slides");
  const recommendationText: Record<AiModel, string> = {
    chatgpt: "適合結構化研究檢查。",
    claude: "適合長文與完整論證分析。",
    gemini: "適合簡報、圖表與多模態內容。",
    grok: "適合口試前反方追問與壓力測試。",
  };

  return (
    <section className="bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.20),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 pb-12 text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-6 shadow-2xl shadow-blue-950/20 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">RESEARCH TASK LAUNCHER</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">研究任務設定</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">選擇研究任務、材料與擔心的地方，整理成可以直接貼給 AI 的研究指令。</p>
          {previewMode ? <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/[0.06] px-4 py-3 text-xs leading-5 text-amber-100">Preview：可操作完整流程，資料不會寫入正式使用紀錄。{promptTemplateLoadError ? " 目前使用內建指令內容。" : ""}</p> : null}
          <div className="mt-7 space-y-7">
            <ResearchTaskSelector value={researchTask} onChange={setResearchTask} />
            <MaterialTypeSelector value={materialType} onChange={setMaterialType} />
            <ResearchConcernSelector value={concerns} onChange={setConcerns} />
            <div>
              <label className="text-sm font-medium text-slate-200" htmlFor="research-stage">你的研究階段</label>
              <select id="research-stage" value={studentStage} onChange={(event) => setStudentStage(event.target.value as StudentStage)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-400">
                {Object.entries(STAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">RECOMMENDED AI</p><p className="mt-2 text-lg font-semibold text-white">推薦使用 {AI_DISPLAY_NAMES[recommendation]}</p><p className="mt-1 text-xs text-slate-400">{recommendationText[recommendation]}</p></div>
                <button type="button" onClick={() => setIsAiManuallySelected((current) => !current)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:border-cyan-300/40">{isAiManuallySelected ? "收合更換" : "更換 AI"}</button>
              </div>
              {isAiManuallySelected ? <div className="mt-4"><AiModelSelector value={selectedAi} onChange={(value) => { setSelectedAi(value); setIsAiManuallySelected(true); }} /></div> : null}
            </div>
            <AdvisorPrefsInput frequentQuestions={frequentQuestions} preferredStyle={preferredStyle} customNote={customNote} onFrequentQuestionsChange={setFrequentQuestions} onPreferredStyleChange={setPreferredStyle} onCustomNoteChange={setCustomNote} />
            {error ? <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
            <button type="button" onClick={() => void generateWithUsageCheck()} disabled={isSubmitting} className="w-full rounded-2xl bg-blue-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70">{isSubmitting ? "正在準備你的研究指令..." : "產生研究 AI 指令"}</button>
          </div>
        </div>
        <GeneratedPromptDisplay prompt={generatedPrompt} taskTitle={taskTitle} benefits={benefits} />
      </div>
      {!isDashboardRoute ? <div className="mx-auto mt-6 w-full max-w-6xl rounded-[2rem] border border-blue-300/15 bg-blue-500/10 p-5 text-sm leading-6 text-blue-50">未登入可免費產生 20 次；完成 Email 驗證或使用 Google 登入後不限次。</div> : null}
      {!previewMode ? <UsageGateModal isOpen={usageGate.isOpen} message={usageGate.message} onVerified={() => { setHasVerifiedEmailSession(true); setUsageGate({ isOpen: false, message: "" }); void generateWithUsageCheck(true); }} onClose={() => setUsageGate({ isOpen: false, message: "" })} /> : null}
    </section>
  );
}
