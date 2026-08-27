"use client";

import type { MaterialType } from "@/lib/prompt-builder/types";
import { MATERIAL_TYPE_OPTIONS } from "./options";

interface MaterialTypeSelectorProps {
  value: MaterialType | null;
  onChange: (value: MaterialType) => void;
}

export function MaterialTypeSelector({ value, onChange }: MaterialTypeSelectorProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-lg font-semibold text-white">你準備拿什麼給 AI 看？</legend>
      <p className="text-sm text-slate-400">選擇你等一下會一起提供給 AI 的研究材料。</p>
      <div className="flex flex-wrap gap-2">
        {MATERIAL_TYPE_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`rounded-full border px-4 py-2.5 text-sm transition ${selected ? "border-cyan-300/70 bg-cyan-400/15 text-white" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/40 hover:text-white"}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
