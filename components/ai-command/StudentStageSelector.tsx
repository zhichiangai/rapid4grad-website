"use client";

import type { StudentStage } from "@/lib/prompt-builder/types";
import { STUDENT_STAGE_OPTIONS } from "./options";

interface StudentStageSelectorProps {
  value: StudentStage;
  onChange: (value: StudentStage) => void;
}

export function StudentStageSelector({ value, onChange }: StudentStageSelectorProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-slate-200">學生年級階段</legend>
      <div className="grid gap-3">
        {STUDENT_STAGE_OPTIONS.map((option) => {
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
              <span className="block text-sm font-semibold text-white">{option.label}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">{option.description}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
