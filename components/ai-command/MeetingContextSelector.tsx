"use client";

import type { MeetingContext } from "@/lib/prompt-builder/types";
import { MEETING_CONTEXT_OPTIONS } from "./options";

interface MeetingContextSelectorProps {
  value: MeetingContext;
  onChange: (value: MeetingContext) => void;
}

export function MeetingContextSelector({ value, onChange }: MeetingContextSelectorProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-200">會議任務情境</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as MeetingContext)}
        className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
      >
        {MEETING_CONTEXT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} - {option.description}
          </option>
        ))}
      </select>
    </label>
  );
}
