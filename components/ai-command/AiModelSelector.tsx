"use client";

import type { AiModel } from "@/lib/prompt-builder/types";
import { AI_MODEL_OPTIONS } from "./options";

interface AiModelSelectorProps {
  value: AiModel;
  onChange: (value: AiModel) => void;
}

export function AiModelSelector({ value, onChange }: AiModelSelectorProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-slate-200">外部 AI 選擇</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {AI_MODEL_OPTIONS.map((option) => {
          const selected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`rounded-2xl border p-4 text-left transition ${
                selected
                  ? "border-blue-400 bg-blue-500/15 shadow-lg shadow-blue-500/15"
                  : "border-white/10 bg-white/[0.04] hover:border-blue-300/40 hover:bg-white/[0.07]"
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-white">
                  {option.label}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-blue-100">
                  {option.badge}
                </span>
              </span>
              <span className="mt-2 block text-xs leading-5 text-slate-400">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
