"use client";

import { useState } from "react";
import { AdvisorPrefsInput } from "./AdvisorPrefsInput";
import { MaterialTypeSelector } from "./MaterialTypeSelector";
import { ResearchConcernSelector } from "./ResearchConcernSelector";
import { ResearchTaskSelector } from "./ResearchTaskSelector";
import { PromptPackDisplay } from "./PromptPackDisplay";
import { UsageGateModal } from "./UsageGateModal";
import { CONCERN_TO_PAIN_POINTS, TASK_PRESETS } from "./options";
import { buildPromptPack } from "@/lib/prompt-builder/prompt-pack-builder";
import type { AdvisorPrefs, MaterialType, PromptTemplate, ResearchConcern, ResearchTask, StudentStage } from "@/lib/prompt-builder/types";
import type { PromptPackResult } from "@/lib/prompt-builder/prompt-pack-types";

type UsageStatus = "allowed" | "verification_required" | "error";
interface AiCommandContainerProps { isDashboardRoute?: boolean; activePromptTemplates?: PromptTemplate[]; promptTemplateLoadError?: string; previewMode?: boolean; }
// Legacy buildPrompt(...) remains available for the backward-compatible single-prompt flow; V3 results use buildPromptPack.
function lines(value: string) { return value.split("\n").map((item) => item.trim()).filter(Boolean); }

export function AiCommandContainer({ isDashboardRoute = false, activePromptTemplates = [], promptTemplateLoadError, previewMode = false }: AiCommandContainerProps) {
  void activePromptTemplates;
  void promptTemplateLoadError;
  const [researchTask, setResearchTask] = useState<ResearchTask>("meeting");
  const [materialType, setMaterialType] = useState<MaterialType>("slides");
  const [concerns, setConcerns] = useState<ResearchConcern[]>(["method", "figure", "advisor_questions"]);
  const [studentStage, setStudentStage] = useState<StudentStage | null>(null);
  const [userContext, setUserContext] = useState("");
  const [frequentQuestions, setFrequentQuestions] = useState("");
  const [preferredStyle, setPreferredStyle] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [result, setResult] = useState<PromptPackResult | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usageGate, setUsageGate] = useState({ isOpen: false, message: "" });
  const [hasVerifiedEmailSession, setHasVerifiedEmailSession] = useState(false);

  const handleTaskChange = (task: ResearchTask) => {
    setResearchTask(task);
    setMaterialType(task === "meeting" || task === "defense" || task === "presentation" ? "slides" : task === "other" ? "unknown" : "draft");
    const defaults: Record<ResearchTask, ResearchConcern[]> = { meeting: ["method", "figure", "advisor_questions"], defense: ["gap", "method", "figure", "overclaim", "advisor_questions"], submission: ["gap", "method", "figure", "overclaim"], draft: ["motivation", "gap", "method", "overclaim"], presentation: ["figure", "overclaim", "advisor_questions"], logic: ["motivation", "gap", "method", "overclaim"], other: ["all"] };
    setConcerns(defaults[task]);
  };
  const buildInput = () => ({ researchTask, materialType, concerns, studentStage: studentStage ?? undefined, userContext: userContext.trim() || undefined, advisorPrefs: { frequentQuestions: lines(frequentQuestions), preferredStyle: preferredStyle.trim() || undefined, customNote: customNote.trim() || undefined } satisfies AdvisorPrefs });
  const generate = async (verified = false) => {
    const pack = buildPromptPack(buildInput());
    const prompt = "V3_PROMPT_PACK";
    setError(null);
    if (previewMode) { setResult(pack); setGeneratedPrompt(prompt); return; }
    setIsSubmitting(true);
    const preset = TASK_PRESETS[researchTask];
    const selectedStage = studentStage ?? "master_2";
    // Legacy API requires a valid studentStage. This fallback is for usage logging compatibility only and must never be injected into the V3 prompt unless the user explicitly selected a stage.
    const compactSummary = `V3_PROMPT_PACK\ntask=${researchTask}\nmaterial=${materialType}\nrecommended=${pack.recommendedPlatform}\nplatforms=4\nsteps_per_platform=5`;
    try {
      const response = await fetch("/api/ai-usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isAnonymousTrial: !(verified || hasVerifiedEmailSession), studentStage: selectedStage, meetingContext: preset.meetingContext, painPoints: Array.from(new Set([...preset.painPoints, ...concerns.flatMap((item) => CONCERN_TO_PAIN_POINTS[item])])), selectedAi: pack.recommendedPlatform, instructionTypes: preset.instructionTypes, advisorPrefs: buildInput().advisorPrefs, generatedPrompt: compactSummary }) });
      const payload = (await response.json()) as { status?: UsageStatus; message?: string };
      if (payload.status === "allowed") { setResult(pack); return; }
      if (payload.status === "verification_required") { setUsageGate({ isOpen: true, message: payload.message ?? "請完成 Email 驗證後繼續。" }); return; }
      setError(payload.message ?? "目前無法產生研究任務包，請稍後再試。");
    } catch { setError("目前無法連線，請稍後再試。"); } finally { setIsSubmitting(false); }
  };
  void generatedPrompt;

  return <section className="bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.2),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 pb-12 text-white"><div className={`mx-auto w-full ${result ? "max-w-7xl" : "max-w-3xl"}`}><div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-blue-950/20 backdrop-blur sm:p-7"><p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">RAPID RESEARCH COPILOT</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">研究任務設定</h2><p className="mt-3 text-sm leading-6 text-slate-400">選一個研究任務，必要時補一句你的狀況。RAPID 會一次產生四套研究工作流程。</p>{previewMode ? <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/[0.06] px-4 py-3 text-xs text-amber-100">Admin Preview：可操作完整流程，不會扣除使用次數。</p> : null}<div className="mt-7 space-y-6"><ResearchTaskSelector value={researchTask} onChange={handleTaskChange} /><label className="block"><span className="text-sm font-medium text-slate-200">你的情況（選填，一句話即可）</span><textarea value={userContext} onChange={(event) => setUserContext(event.target.value)} rows={3} maxLength={500} className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-400" placeholder="例如：明天要跟教授報告，但我最擔心對照組會被追問。" /></label><details className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><summary className="cursor-pointer list-none text-sm font-semibold text-white">想調整材料、研究階段或教授偏好？</summary><div className="mt-5 space-y-5"><MaterialTypeSelector value={materialType} onChange={setMaterialType} /><ResearchConcernSelector value={concerns} onChange={setConcerns} /><label className="block"><span className="text-sm font-medium text-slate-200">研究階段（選填）</span><select value={studentStage ?? ""} onChange={(event) => setStudentStage((event.target.value || null) as StudentStage | null)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white"><option value="">未指定</option><option value="master_1">碩一新生</option><option value="master_2">碩二衝刺生</option><option value="master_3_plus">碩三以上</option><option value="phd">博士班</option><option value="part_time">在職專班</option></select></label><AdvisorPrefsInput frequentQuestions={frequentQuestions} preferredStyle={preferredStyle} customNote={customNote} onFrequentQuestionsChange={setFrequentQuestions} onPreferredStyleChange={setPreferredStyle} onCustomNoteChange={setCustomNote} /></div></details>{error ? <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}<button type="button" onClick={() => void generate()} disabled={isSubmitting} className="w-full rounded-2xl bg-blue-500 px-5 py-4 text-sm font-semibold shadow-lg shadow-blue-500/25 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70">{isSubmitting ? "正在整理 4 大 AI 任務包..." : "產生 4 大 AI 研究任務包"}</button></div></div>{result ? <div className="mt-6"><PromptPackDisplay result={result} /></div> : null}</div>{!isDashboardRoute ? <p className="mx-auto mt-6 max-w-3xl rounded-2xl border border-blue-300/15 bg-blue-500/10 px-4 py-3 text-center text-sm text-blue-50">未登入可免費產生 20 次；完成 Email 驗證或使用 Google 登入後不限次。</p> : null}{!previewMode ? <UsageGateModal isOpen={usageGate.isOpen} message={usageGate.message} onVerified={() => { setHasVerifiedEmailSession(true); setUsageGate({ isOpen: false, message: "" }); void generate(true); }} onClose={() => setUsageGate({ isOpen: false, message: "" })} /> : null}</section>;
}
