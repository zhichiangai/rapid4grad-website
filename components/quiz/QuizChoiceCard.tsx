"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

type QuizOptionValue = "A" | "B" | "C" | "D";

interface QuizOption {
  value: QuizOptionValue;
  label: string;
}

interface QuizChoiceCardProps {
  options: QuizOption[];
  selectedValue: QuizOptionValue | null;
  onSelect: (value: QuizOptionValue) => void;
  disabled?: boolean;
}

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

export function QuizChoiceCard({
  options,
  selectedValue,
  onSelect,
  disabled = false,
}: QuizChoiceCardProps) {
  const [animatingValue, setAnimatingValue] = useState<QuizOptionValue | null>(
    null,
  );

  const handleSelect = (value: QuizOptionValue) => {
    if (disabled || selectedValue === value) return;

    setAnimatingValue(value);
    onSelect(value);

    window.setTimeout(() => {
      setAnimatingValue(null);
    }, 220);
  };

  return (
    <div className="grid w-full gap-3">
      {options.map((option) => {
        const isSelected = selectedValue === option.value;
        const isAnimating = animatingValue === option.value;

        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            onClick={() => handleSelect(option.value)}
            className={cn(
              "group relative flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left",
              "transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
              "select-none",
              !disabled && "cursor-pointer",
              !isSelected &&
                "border-white/10 bg-white/[0.04] text-slate-200 shadow-sm hover:border-blue-300/50 hover:bg-white/[0.08] hover:text-white",
              isSelected &&
                "border-blue-400 bg-blue-500/15 text-white shadow-lg shadow-blue-500/20",
              isAnimating && "scale-[0.98]",
              disabled && "cursor-not-allowed opacity-55",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                !isSelected &&
                  "border-white/20 bg-transparent text-slate-400 group-hover:border-blue-300/50 group-hover:text-blue-200",
                isSelected && "border-blue-300 bg-blue-400/15 text-blue-100",
              )}
            >
              {option.value}
            </span>

            <span className="flex-1 text-sm font-medium leading-relaxed sm:text-base">
              {option.label}
            </span>

            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all",
                isSelected
                  ? "scale-100 bg-blue-400 text-slate-950 opacity-100"
                  : "scale-75 bg-transparent text-transparent opacity-0",
              )}
              aria-hidden="true"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.31a1 1 0 0 1-1.42.002L3.29 9.224a1 1 0 1 1 1.42-1.408l4.04 4.075 6.54-6.595a1 1 0 0 1 1.414-.006Z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </button>
        );
      })}
    </div>
  );
}
