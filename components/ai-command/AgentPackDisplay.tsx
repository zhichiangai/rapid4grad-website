"use client";

import { useEffect, useState } from "react";
import type { AgentPackResult, AgentPlatform } from "@/lib/prompt-builder/agent-pack-types";
import { AGENT_PLATFORM_LABELS } from "@/lib/prompt-builder/agent-pack-config";

interface AgentPackDisplayProps { result: AgentPackResult | null; }

export function AgentPackDisplay({ result }: AgentPackDisplayProps) {
  const [activePlatform, setActivePlatform] = useState<AgentPlatform>(result?.recommendedPlatform ?? "codex");
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (result) setActivePlatform(result.recommendedPlatform);
  }, [result]);
  if (!result) return null;
  const pack = result.packs[activePlatform];
  const copy = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied((current) => current === key ? null : current), 2000);
  };
  const platforms = Object.keys(AGENT_PLATFORM_LABELS) as AgentPlatform[];

  return (
    <section className="rounded-[2rem] border border-cyan-300/20 bg-slate-950/90 p-5 text-white shadow-2xl shadow-cyan-950/20 sm:p-7">
      <div className="border-b border-white/10 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">RAPID AI NAVIGATOR</p>
        <h2 className="mt-3 text-2xl font-semibold">Agent 任務已準備好</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">RAPID 已替你選好必要能力，完整指令會先檢查 Skills，再執行你的研究任務。</p>
        <p className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm leading-6 text-cyan-50">推薦 Agent：{AGENT_PLATFORM_LABELS[result.recommendedPlatform]}。{result.recommendationReason}</p>
      </div>

      <div className="mt-6 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2" role="tablist" aria-label="Agent 平台">
          {platforms.map((platform) => <button key={platform} type="button" role="tab" aria-selected={activePlatform === platform} onClick={() => setActivePlatform(platform)} className={`rounded-full border px-4 py-2 text-sm transition ${activePlatform === platform ? "border-cyan-300 bg-cyan-400/15 text-cyan-50" : "border-white/10 text-slate-400 hover:border-cyan-300/40 hover:text-white"}`}>{AGENT_PLATFORM_LABELS[platform]}{platform === result.recommendedPlatform ? " · 推薦" : ""}</button>)}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold text-cyan-50">貼到 {AGENT_PLATFORM_LABELS[activePlatform]} 即可開始</p><p className="mt-1 text-xs leading-5 text-cyan-100/70">Agent 會自行檢查能力並開始工作，不需要回到 RAPID 再複製第二段。</p></div>
          <button type="button" onClick={() => void copy(pack.fullPrompt, `full-${activePlatform}`)} className="w-full rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-300 sm:w-auto">{copied === `full-${activePlatform}` ? `已複製，可以直接貼給 ${AGENT_PLATFORM_LABELS[activePlatform]}` : "複製完整 Agent 指令"}</button>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold">這次 Agent 會使用的能力</h3>
        <p className="mt-1 text-xs text-slate-500">RAPID 只會為當前任務準備必要能力，不會一次安裝整套 Skill Library。</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {pack.skills.map((skill) => <div key={skill.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><p className="font-semibold text-white">{skill.displayName}</p><p className="mt-1 text-xs leading-5 text-slate-400">{skill.description}</p></div>)}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-lg font-semibold">{AGENT_PLATFORM_LABELS[activePlatform]} 執行包</h3><p className="mt-1 text-xs text-slate-500">同一份任務只計一次使用額度；切換平台不會重新生成。</p></div>
      </div>

      <details className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <summary className="cursor-pointer text-sm font-semibold text-white">這個 Agent 會怎麼做？</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-400"><li>檢查目前 Agent 與專案規則。</li><li>檢查核准 Skills。</li><li>缺少時安全準備指定版本。</li><li>讀取研究資料 / 專案。</li><li>執行任務並驗證。</li><li>回報結果與風險。</li></ol>
      </details>

      <details className="mt-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <summary className="cursor-pointer text-sm font-semibold text-white">進階複製選項</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => void copy(pack.skillBootstrapPrompt, `skills-${activePlatform}`)} className="rounded-xl border border-white/10 px-4 py-3 text-left text-xs text-slate-200 hover:border-cyan-300/40">{copied === `skills-${activePlatform}` ? "✅ 已複製！" : "只複製 Skill 準備"}</button><button type="button" onClick={() => void copy(pack.taskPrompt, `task-${activePlatform}`)} className="rounded-xl border border-white/10 px-4 py-3 text-left text-xs text-slate-200 hover:border-cyan-300/40">{copied === `task-${activePlatform}` ? "✅ 已複製！" : "只複製工作任務"}</button></div>
      </details>

      <details className="mt-3 rounded-2xl border border-amber-300/15 bg-amber-400/[0.04] p-4">
        <summary className="cursor-pointer text-sm font-semibold text-amber-100">Skill 技術資料</summary>
        <div className="mt-3 space-y-3">{pack.skills.map((skill) => <div key={skill.id} className="rounded-xl bg-black/20 p-3 text-xs leading-5 text-slate-400"><p className="font-semibold text-slate-200">{skill.id}</p><p>Repository: {skill.repository}</p><p>Path: {skill.path}</p><p>Approved SHA: {skill.commitSha}</p><p>License: {skill.license} · Reviewed: {skill.reviewedAt}</p><p>Project target: {activePlatform === "claude_code" ? ".claude/skills" : ".agents/skills"}</p></div>)}</div>
      </details>

      <details className="mt-3 rounded-2xl border border-white/10 bg-gray-900 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-200">查看完整 Agent 指令</summary>
        <pre className="mt-3 max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-4 font-mono text-xs leading-6 text-gray-300">{pack.fullPrompt}</pre>
      </details>
    </section>
  );
}
