"use client";

import type { InteractionMode } from "@/lib/prompt-builder/agent-pack-types";

interface ModeSelectorProps {
  value: InteractionMode;
  onChange: (value: InteractionMode) => void;
}

const MODES: Array<{ value: InteractionMode; label: string; description: string }> = [
  { value: "chat", label: "聊天 / 分析", description: "讓 AI 讀懂、分析並提供建議" },
  { value: "agent", label: "Agent / 直接執行", description: "讓 Agent 讀檔、使用工具、修改並驗證" },
];

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">工作模式</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {MODES.map((mode) => (
          <button
            key={mode.value}
            type="button"
            aria-pressed={value === mode.value}
            onClick={() => onChange(mode.value)}
            className={`rounded-2xl border p-4 text-left transition ${value === mode.value ? "border-cyan-300 bg-cyan-400/15 shadow-lg shadow-cyan-950/30" : "border-white/10 bg-white/[0.03] hover:border-cyan-300/40 hover:bg-white/[0.06]"}`}
          >
            <span className="block font-semibold text-white">{mode.label}</span>
            <span className="mt-1 block text-xs leading-5 text-slate-400">{mode.description}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
