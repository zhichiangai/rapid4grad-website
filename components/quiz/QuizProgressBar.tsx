interface QuizProgressBarProps {
  current: number;
  total?: number;
}

export function QuizProgressBar({ current, total = 7 }: QuizProgressBarProps) {
  const safeTotal = Math.max(total, 1);
  const safeCurrent = Math.min(Math.max(current, 1), safeTotal);
  const progress = (safeCurrent / safeTotal) * 100;

  return (
    <div className="w-full space-y-3" aria-label={`第 ${safeCurrent} / ${safeTotal} 題`}>
      <div className="flex items-center justify-between text-xs font-medium tracking-[0.18em] text-slate-400">
        <span>研究生畢業狀態檢查</span>
        <span className="text-blue-200">
          第 {safeCurrent} / {safeTotal} 題
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-blue-500 shadow-[0_0_18px_rgba(59,130,246,0.55)] transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
