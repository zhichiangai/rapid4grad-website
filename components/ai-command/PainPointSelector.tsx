"use client";

import type { PainPoint } from "@/lib/prompt-builder/types";
import { PAIN_POINT_OPTIONS, toggleValue } from "./options";

interface PainPointSelectorProps {
  value: PainPoint[];
  onChange: (value: PainPoint[]) => void;
}

export function PainPointSelector({ value, onChange }: PainPointSelectorProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-slate-200">核心痛點（可多選）</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {PAIN_POINT_OPTIONS.map((option) => {
          const selected = value.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(toggleValue(value, option.value))}
              className={`rounded-2xl border p-4 text-left transition ${
                selected
                  ? "border-cyan-300/60 bg-cyan-400/10 text-white shadow-lg shadow-cyan-500/10"
                  : "border-white/10 bg-white/[0.04] text-slate-200 hover:border-cyan-300/35 hover:bg-white/[0.07]"
              }`}
            >
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">{option.description}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
