import Link from "next/link";
import { attentionSignalLabel, type AttentionStudent } from "@/lib/professor/attention";
import { getTaipeiDate } from "@/lib/supervision/week";

const severityStyles = {
  urgent: { label: "優先處理", className: "border-red-300/30 bg-red-400/10 text-red-100" },
  attention: { label: "需要留意", className: "border-amber-300/30 bg-amber-400/10 text-amber-100" },
  healthy: { label: "目前穩定", className: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100" },
} as const;

function relativeDate(value: string | null) {
  if (!value) return "尚無更新";
  const today = new Date();
  const current = new Date(`${getTaipeiDate(today)}T00:00:00+08:00`).getTime();
  const activity = new Date(`${getTaipeiDate(new Date(value))}T00:00:00+08:00`).getTime();
  const days = Math.max(0, Math.floor((current - activity) / 86_400_000));
  return days === 0 ? "今天" : days === 1 ? "昨天" : `${days} 天前`;
}

export function ProfessorAttentionCard({ student, compact = false }: { student: AttentionStudent; compact?: boolean }) {
  const severity = severityStyles[student.severity];
  const signals = compact ? student.signals.slice(0, 3) : student.signals;
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-white">{student.name}</h3>
          <p className="mt-1 text-sm text-slate-400">{student.labName}</p>
          <p className="mt-1 text-xs text-slate-500">{student.degree ?? "未設定學位"} · {student.researchArea ?? "未設定研究領域"}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${severity.className}`}>{severity.label}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {signals.map((signal) => <span key={signal} className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs text-slate-200">{attentionSignalLabel(signal)}</span>)}
      </div>
      {student.latestWeekly ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">最近卡點</p>
          <p className="mt-2 line-clamp-3 leading-6">{student.latestWeekly.blockers || student.latestWeekly.nextPlan}</p>
        </div>
      ) : null}
      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>最後更新：{relativeDate(student.lastActivityAt)}</span>
        <Link href={`/professor/labs/${student.labId}/students/${student.studentId}`} className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">查看學生</Link>
      </div>
    </article>
  );
}
