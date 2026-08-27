"use client";

import type { ResearchTask } from "@/lib/prompt-builder/types";
import { RESEARCH_TASK_OPTIONS } from "./options";

interface ResearchTaskSelectorProps {
  value: ResearchTask | null;
  onChange: (value: ResearchTask) => void;
}

export function ResearchTaskSelector({ value, onChange }: ResearchTaskSelectorProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-lg font-semibold text-white">你現在要準備什麼？</legend>
      <p className="text-sm text-slate-400">先選你現在最需要處理的研究任務。</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {RESEARCH_TASK_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`rounded-2xl border p-4 text-left transition ${selected ? "border-blue-300 bg-blue-500/15 shadow-lg shadow-blue-500/15" : "border-white/10 bg-white/[0.04] hover:border-blue-300/40 hover:bg-white/[0.07]"}`}
            >
              <span className="block text-sm font-semibold text-white">{option.label}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">{option.description}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
