"use client";

import type { InstructionType } from "@/lib/prompt-builder/types";
import { INSTRUCTION_TYPE_OPTIONS, toggleValue } from "./options";

interface InstructionTypeSelectorProps {
  value: InstructionType[];
  onChange: (value: InstructionType[]) => void;
}

export function InstructionTypeSelector({
  value,
  onChange,
}: InstructionTypeSelectorProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-slate-200">
        指令方向（可多選）
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {INSTRUCTION_TYPE_OPTIONS.map((option) => {
          const selected = value.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(toggleValue(value, option.value))}
              className={`rounded-2xl border p-4 text-left transition ${
                selected
                  ? "border-indigo-300/60 bg-indigo-400/10 text-white shadow-lg shadow-indigo-500/10"
                  : "border-white/10 bg-white/[0.04] text-slate-200 hover:border-indigo-300/35 hover:bg-white/[0.07]"
              }`}
            >
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
