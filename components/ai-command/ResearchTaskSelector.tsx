"use client";

import type { ResearchTask } from "@/lib/prompt-builder/types";
import { RESEARCH_TASK_OPTIONS } from "./options";

interface ResearchTaskSelectorProps {
  value: ResearchTask | null;
  onChange: (value: ResearchTask) => void;
}

export function ResearchTaskSelector({ value, onChange }: ResearchTaskSelectorProps) {
  const selectedOption = RESEARCH_TASK_OPTIONS.find((option) => option.value === value);
  return (
    <fieldset className="space-y-3">
      <legend className="text-lg font-semibold text-white">你現在要準備什麼？</legend>
      <p className="text-sm text-slate-400">先選你現在最需要處理的研究任務。</p>
      <div className="flex flex-wrap gap-2">
        {RESEARCH_TASK_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
            className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${selected ? "border-blue-300 bg-blue-500/15 text-blue-50 shadow-lg shadow-blue-500/15" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-blue-300/40 hover:bg-white/[0.07]"}`}
            >
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
      {selectedOption ? <p className="text-xs leading-5 text-slate-500">{selectedOption.description}</p> : null}
    </fieldset>
  );
}
