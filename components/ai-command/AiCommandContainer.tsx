"use client";

import { useState } from "react";
import { AdvisorPrefsInput } from "./AdvisorPrefsInput";
import { AgentModePanel } from "./AgentModePanel";
import { AgentPackDisplay } from "./AgentPackDisplay";
import { MaterialTypeSelector } from "./MaterialTypeSelector";
import { ModeSelector } from "./ModeSelector";
import { PromptPackDisplay } from "./PromptPackDisplay";
import { ResearchConcernSelector } from "./ResearchConcernSelector";
import { ResearchTaskSelector } from "./ResearchTaskSelector";
import { UsageGateModal } from "./UsageGateModal";
import { CONCERN_TO_PAIN_POINTS, TASK_PRESETS } from "./options";
import { buildAgentPack } from "@/lib/prompt-builder/agent-pack-builder";
import { buildPromptPack } from "@/lib/prompt-builder/prompt-pack-builder";
import type { AgentPackResult, AgentTask, InteractionMode } from "@/lib/prompt-builder/agent-pack-types";
import type { AdvisorPrefs, MaterialType, PromptTemplate, ResearchConcern, ResearchTask, StudentStage } from "@/lib/prompt-builder/types";
import type { PromptPackResult } from "@/lib/prompt-builder/prompt-pack-types";

type UsageStatus = "allowed" | "verification_required" | "error";
interface AiCommandContainerProps { isDashboardRoute?: boolean; activePromptTemplates?: PromptTemplate[]; promptTemplateLoadError?: string; previewMode?: boolean; }
// Legacy buildPrompt(...) remains available for the backward-compatible single-prompt flow; V3 results use buildPromptPack.
function lines(value: string) { return value.split("\n").map((item) => item.trim()).filter(Boolean); }

export function AiCommandContainer({ isDashboardRoute = false, activePromptTemplates = [], promptTemplateLoadError, previewMode = false }: AiCommandContainerProps) {
  void activePromptTemplates;
  void promptTemplateLoadError;
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("chat");
  const [researchTask, setResearchTask] = useState<ResearchTask>("meeting");
  const [materialType, setMaterialType] = useState<MaterialType>("slides");
  const [concerns, setConcerns] = useState<ResearchConcern[]>(["method", "figure", "advisor_questions"]);
  const [studentStage, setStudentStage] = useState<StudentStage | null>(null);
  const [userContext, setUserContext] = useState("");
  const [frequentQuestions, setFrequentQuestions] = useState("");
  const [preferredStyle, setPreferredStyle] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [agentTask, setAgentTask] = useState<AgentTask>("literature");
  const [agentContext, setAgentContext] = useState("");
  const [workingPath, setWorkingPath] = useState("");
  const [constraints, setConstraints] = useState("");
  const [result, setResult] = useState<PromptPackResult | null>(null);
  const [agentResult, setAgentResult] = useState<AgentPackResult | null>(null);
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

  const requestUsage = async (summary: string, verified: boolean, selectedAi: string, meetingContext: string, painPoints: string[], instructionTypes: string[]) => {
    const response = await fetch("/api/ai-usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isAnonymousTrial: !(verified || hasVerifiedEmailSession), studentStage: studentStage ?? "master_2", meetingContext, painPoints, selectedAi, instructionTypes, advisorPrefs: {}, generatedPrompt: summary }) });
    return (await response.json()) as { status?: UsageStatus; message?: string };
  };

  const generateChat = async (verified = false) => {
    const pack = buildPromptPack(buildInput());
    const prompt = "V3_PROMPT_PACK";
    setError(null);
    if (previewMode) { setResult(pack); setGeneratedPrompt(prompt); return; }
    setIsSubmitting(true);
    const preset = TASK_PRESETS[researchTask];
    const compactSummary = `V3_PROMPT_PACK\ntask=${researchTask}\nmaterial=${materialType}\nrecommended=${pack.recommendedPlatform}\nplatforms=4\nsteps_per_platform=5`;
    try {
      const payload = await requestUsage(compactSummary, verified, pack.recommendedPlatform, preset.meetingContext, Array.from(new Set([...preset.painPoints, ...concerns.flatMap((item) => CONCERN_TO_PAIN_POINTS[item])])), preset.instructionTypes);
      if (payload.status === "allowed") { setResult(pack); return; }
      if (payload.status === "verification_required") { setUsageGate({ isOpen: true, message: payload.message ?? "請完成 Email 驗證後繼續。" }); return; }
      setError(payload.message ?? "目前無法產生研究任務包，請稍後再試。");
    } catch { setError("目前無法連線，請稍後再試。"); } finally { setIsSubmitting(false); }
  };

  const generateAgent = async (verified = false) => {
    const pack = buildAgentPack({ task: agentTask, agentContext, workingPath, constraints });
    const prompt = "V4_AGENT_PACK";
    setError(null);
    if (previewMode) { setAgentResult(pack); setGeneratedPrompt(prompt); return; }
    setIsSubmitting(true);
    const selectedAi = pack.recommendedPlatform === "claude_code" ? "claude" : "chatgpt";
    const compactSummary = `V4_AGENT_PACK\nmode=agent\ntask=${agentTask}\nrecommended=${pack.recommendedPlatform}\nskills=${pack.packs[pack.recommendedPlatform].skills.map((skill) => skill.id).join(",")}\nplatforms=5`;
    try {
      const payload = await requestUsage(compactSummary, verified, selectedAi, "other", ["other"], ["logic_check"]);
      if (payload.status === "allowed") { setAgentResult(pack); return; }
      if (payload.status === "verification_required") { setUsageGate({ isOpen: true, message: payload.message ?? "請完成 Email 驗證後繼續。" }); return; }
      setError(payload.message ?? "目前無法產生 Agent 執行包，請稍後再試。");
    } catch { setError("目前無法連線，請稍後再試。"); } finally { setIsSubmitting(false); }
  };
  const generate = () => interactionMode === "agent" ? generateAgent() : generateChat();

  return (
    <section className="bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.2),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 pb-12 text-white">
      <div className={`mx-auto w-full ${result || agentResult ? "max-w-7xl" : "max-w-3xl"}`}>
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-blue-950/20 backdrop-blur sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">RAPID AI NAVIGATOR</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">RAPID AI Navigator</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">把研究材料轉成可以分析或直接執行的清楚工作指令。</p>
          {previewMode ? <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/[0.06] px-4 py-3 text-xs text-amber-100">Admin Preview：可操作完整流程，不會扣除使用次數。</p> : null}
          <div className="mt-7 space-y-6">
            <ModeSelector value={interactionMode} onChange={(mode) => { setInteractionMode(mode); setError(null); }} />
            {interactionMode === "agent" ? <AgentModePanel task={agentTask} context={agentContext} workingPath={workingPath} constraints={constraints} isSubmitting={isSubmitting} onTaskChange={setAgentTask} onContextChange={setAgentContext} onWorkingPathChange={setWorkingPath} onConstraintsChange={setConstraints} onGenerate={() => void generate()} /> : <>
              <ResearchTaskSelector value={researchTask} onChange={handleTaskChange} />
              <label className="block"><span className="text-sm font-medium text-slate-200">你的情況（選填，一句話即可）</span><textarea value={userContext} onChange={(event) => setUserContext(event.target.value)} rows={3} maxLength={500} className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-400" placeholder="例如：明天要跟教授報告，但我最擔心對照組會被追問。" /></label>
              <details className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><summary className="cursor-pointer list-none text-sm font-semibold text-white">想調整材料、研究階段或教授偏好？</summary><div className="mt-5 space-y-5"><MaterialTypeSelector value={materialType} onChange={setMaterialType} /><ResearchConcernSelector value={concerns} onChange={setConcerns} /><label className="block"><span className="text-sm font-medium text-slate-200">研究階段（選填）</span><select value={studentStage ?? ""} onChange={(event) => setStudentStage((event.target.value || null) as StudentStage | null)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white"><option value="">未指定</option><option value="master_1">碩一新生</option><option value="master_2">碩二衝刺生</option><option value="master_3_plus">碩三以上</option><option value="phd">博士班</option><option value="part_time">在職專班</option></select></label><AdvisorPrefsInput frequentQuestions={frequentQuestions} preferredStyle={preferredStyle} customNote={customNote} onFrequentQuestionsChange={setFrequentQuestions} onPreferredStyleChange={setPreferredStyle} onCustomNoteChange={setCustomNote} /></div></details>
              {error ? <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
              <button type="button" onClick={() => void generate()} disabled={isSubmitting} className="w-full rounded-2xl bg-blue-500 px-5 py-4 text-sm font-semibold shadow-lg shadow-blue-500/25 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70">{isSubmitting ? "正在整理 4 大 AI 任務包..." : "產生 4 大 AI 研究任務包"}</button>
            </>}
            {interactionMode === "agent" && error ? <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
          </div>
        </div>
        {interactionMode === "chat" && result ? <div className="mt-6"><PromptPackDisplay result={result} /></div> : null}
        {interactionMode === "agent" && agentResult ? <div className="mt-6"><AgentPackDisplay result={agentResult} /></div> : null}
      </div>
      {!isDashboardRoute ? <p className="mx-auto mt-6 max-w-3xl rounded-2xl border border-blue-300/15 bg-blue-500/10 px-4 py-3 text-center text-sm text-blue-50">未登入可免費產生 20 次；完成 Email 驗證或使用 Google 登入後不限次。</p> : null}
      {!previewMode ? <UsageGateModal isOpen={usageGate.isOpen} message={usageGate.message} onVerified={() => { setHasVerifiedEmailSession(true); setUsageGate({ isOpen: false, message: "" }); void (interactionMode === "agent" ? generateAgent(true) : generateChat(true)); }} onClose={() => setUsageGate({ isOpen: false, message: "" })} /> : null}
      {generatedPrompt === "" ? null : null}
    </section>
  );
}
