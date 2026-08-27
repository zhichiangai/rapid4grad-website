"use client";

import type { ResearchConcern } from "@/lib/prompt-builder/types";
import { RESEARCH_CONCERN_OPTIONS } from "./options";

interface ResearchConcernSelectorProps {
  value: ResearchConcern[];
  onChange: (value: ResearchConcern[]) => void;
}

export function ResearchConcernSelector({ value, onChange }: ResearchConcernSelectorProps) {
  const toggle = (concern: ResearchConcern) => {
    if (concern === "all") {
      onChange(value.includes("all") ? [] : ["all"]);
      return;
    }
    onChange([
      ...value.filter((item) => item !== "all" && item !== concern),
      ...(value.includes(concern) ? [] : [concern]),
    ]);
  };

  return (
    <fieldset className="space-y-3">
      <legend className="text-lg font-semibold text-white">你最擔心什麼？</legend>
      <p className="text-sm text-slate-400">可以複選。RAPID 會依照你的擔心調整 AI 檢查重點。</p>
      <div className="flex flex-wrap gap-2">
        {RESEARCH_CONCERN_OPTIONS.map((option) => {
          const selected = value.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(option.value)}
              className={`rounded-full border px-3.5 py-2 text-sm transition ${selected ? "border-blue-300/70 bg-blue-500/15 text-white shadow-lg shadow-blue-500/10" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-blue-300/40 hover:text-white"}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
