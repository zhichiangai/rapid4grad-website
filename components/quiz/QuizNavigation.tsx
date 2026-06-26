"use client";

interface QuizNavigationProps {
  currentStep: number;
  totalSteps: number;
  canGoBack: boolean;
  canGoNext: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function QuizNavigation({
  currentStep,
  totalSteps,
  canGoBack,
  canGoNext,
  isLastStep,
  isSubmitting,
  onBack,
  onNext,
  onSubmit,
}: QuizNavigationProps) {
  const primaryLabel = isLastStep ? "送出檢查，查看風險報告" : "下一題";
  const stepLabel = `目前第 ${currentStep + 1} 題，共 ${totalSteps} 題`;

  return (
    <nav
      className="flex w-full items-center justify-between gap-3 pt-2"
      aria-label={stepLabel}
    >
      <div>
        {canGoBack ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onBack}
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            上一題
          </button>
        ) : (
          <span className="block w-[76px]" aria-hidden="true" />
        )}
      </div>

      <button
        type="button"
        disabled={!canGoNext || isSubmitting}
        onClick={isLastStep ? onSubmit : onNext}
        className="inline-flex min-w-32 items-center justify-center rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            送出中...
          </span>
        ) : (
          primaryLabel
        )}
      </button>
    </nav>
  );
}
