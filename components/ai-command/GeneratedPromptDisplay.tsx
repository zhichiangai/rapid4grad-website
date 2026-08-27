"use client";

import { useState } from "react";

interface GeneratedPromptDisplayProps {
  prompt: string;
  taskTitle: string | null;
  benefits: string[];
}

export function GeneratedPromptDisplay({ prompt, taskTitle, benefits }: GeneratedPromptDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const hasPrompt = prompt.trim().length > 0;

  const handleCopy = async () => {
    if (!hasPrompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-6 shadow-2xl shadow-blue-950/20 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">RESULT</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{hasPrompt ? "任務已準備好" : "你的研究任務會出現在這裡"}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {hasPrompt ? taskTitle : "完成左側設定後，RAPID 會替你整理成可以直接貼給 AI 的研究指令。"}
          </p>
        </div>
        <button type="button" disabled={!hasPrompt} onClick={handleCopy} className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${copied ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-300/30" : "bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400"}`}>
          {copied ? "已複製" : "複製 AI 指令"}
        </button>
      </div>

      {!hasPrompt ? (
        <ol className="mt-8 grid gap-3 sm:grid-cols-3">
          {["選研究任務", "選研究材料", "產生 AI 指令"].map((step, index) => (
            <li key={step} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-slate-300">
              <span className="text-xs font-semibold text-cyan-300">0{index + 1}</span>
              <span className="mt-2 block">{step}</span>
            </li>
          ))}
        </ol>
      ) : (
        <>
          <div className="mt-7 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.06] p-5">
            <h3 className="text-sm font-semibold text-cyan-50">這份指令會幫你</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
              {benefits.map((benefit) => <li key={benefit}>• {benefit}</li>)}
            </ul>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <h3 className="text-sm font-semibold text-white">接下來怎麼做</h3>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
              <li>1. 複製下面的 AI 指令</li>
              <li>2. 打開推薦的 AI</li>
              <li>3. 貼上這段指令</li>
              <li>4. 把你的研究材料一起上傳</li>
            </ol>
          </div>
          <details className="mt-4 rounded-2xl border border-white/10 bg-gray-900 p-5" open={isPromptOpen} onToggle={(event) => setIsPromptOpen(event.currentTarget.open)}>
            <summary className="cursor-pointer text-sm font-semibold text-slate-200">查看完整 AI 指令</summary>
            <pre className="mt-4 max-h-[500px] overflow-y-auto whitespace-pre-wrap font-mono text-sm leading-7 text-gray-300">{prompt}</pre>
          </details>
          <p className="mt-4 text-xs leading-5 text-slate-500">現在把這段指令與你的研究材料一起貼到 AI。</p>
        </>
      )}
    </section>
  );
}
