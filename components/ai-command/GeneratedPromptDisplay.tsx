"use client";

import { useState } from "react";

interface GeneratedPromptDisplayProps {
  prompt: string;
}

export function GeneratedPromptDisplay({ prompt }: GeneratedPromptDisplayProps) {
  const [copied, setCopied] = useState(false);
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
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">
            GENERATED PROMPT
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">生成結果</h2>
        </div>

        <button
          type="button"
          disabled={!hasPrompt}
          onClick={handleCopy}
          className={`rounded-2xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
            copied
              ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-300/30"
              : "bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400"
          }`}
        >
          {copied ? "已複製！" : "複製指令"}
        </button>
      </div>

      <pre className="mt-6 max-h-[500px] min-h-[32rem] overflow-y-auto whitespace-pre-wrap rounded-xl border border-gray-800 bg-gray-900 p-5 font-mono text-sm leading-7 text-gray-300">
        {hasPrompt
          ? prompt
          : "請先完成左側選項，點擊「產生 AI 指令」。生成後可在這裡預覽並一鍵複製。"}
      </pre>
    </section>
  );
}
