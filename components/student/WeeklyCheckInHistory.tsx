import { formatTaipeiDateTime, formatWeekRange } from "@/lib/supervision/week";
import { weeklyHelpOptions, weeklyStatuses, type WeeklyUpdate } from "@/lib/supervision/weekly-updates";

const statusBadgeStyles = {
  on_track: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  slightly_behind: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  blocked: "border-red-300/30 bg-red-400/10 text-red-100",
} as const;

export function WeeklyCheckInHistory({ updates }: { updates: WeeklyUpdate[] }) {
  if (updates.length === 0) {
    return <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">History</p><h2 className="mt-3 text-2xl font-semibold">過去的每週進度</h2><div className="mt-6 rounded-2xl border border-dashed border-white/15 px-5 py-8 text-center"><p className="font-semibold text-white">還沒有過去的週進度</p><p className="mt-2 text-sm leading-6 text-slate-400">從這週開始就好。持續幾週後，你會更容易看出自己的研究節奏。</p></div></section>;
  }
  return <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">History</p><h2 className="mt-3 text-2xl font-semibold">過去的每週進度</h2><div className="mt-6 space-y-4">{updates.slice(0, 12).map((update) => { const status = weeklyStatuses.find((item) => item.value === update.self_status); const help = weeklyHelpOptions.find((item) => item.value === update.needs_professor_help); return <article key={update.id} className="rounded-2xl border border-white/10 bg-slate-950/55 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-white">{formatWeekRange(update.week_start)}</h3><span className={`rounded-full border px-3 py-1 text-xs ${statusBadgeStyles[update.self_status as keyof typeof statusBadgeStyles] ?? "border-white/15 bg-white/[0.05] text-slate-200"}`}>{status?.label ?? update.self_status}</span></div><div className="mt-5 grid gap-4 md:grid-cols-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">完成</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{update.completed_summary}</p></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">卡點</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{update.blockers || "本週未記錄明顯卡點"}</p></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">下一步</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{update.next_plan}</p></div></div><p className="mt-5 text-xs text-slate-500">教授協助：<span className="text-slate-300">{help?.label ?? update.needs_professor_help}</span> · 更新於 {formatTaipeiDateTime(update.updated_at)}</p></article>; })}</div></section>;
}
