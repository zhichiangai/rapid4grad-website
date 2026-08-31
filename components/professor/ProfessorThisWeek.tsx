import type { AttentionStudent } from "@/lib/professor/attention";
import { getTaipeiMonday } from "@/lib/supervision/week";

export function ProfessorThisWeek({ students, weekStart = getTaipeiMonday() }: { students: AttentionStudent[]; weekStart?: string }) {
  const updated = students.filter((student) => student.latestWeekly?.weekStart === weekStart);
  const onTrack = updated.filter((student) => student.latestWeekly?.selfStatus === "on_track").length;
  const behind = updated.filter((student) => student.latestWeekly?.selfStatus === "slightly_behind").length;
  const blocked = updated.filter((student) => student.latestWeekly?.selfStatus === "blocked").length;
  const helpSoon = updated.filter((student) => student.latestWeekly?.needsProfessorHelp === "soon").length;
  const values = [["已更新", `${updated.length} / ${students.length}`, "border-cyan-300/20 text-cyan-100"], ["進度正常", onTrack, "border-emerald-300/20 text-emerald-100"], ["稍微落後", behind, "border-amber-300/20 text-amber-100"], ["目前卡住", blocked, "border-red-300/20 text-red-100"]] as const;
  return <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">This Week</p><h2 className="mt-2 text-2xl font-semibold text-white">本週研究狀態</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{values.map(([label, value, styles]) => <div key={label} className={`rounded-2xl border bg-slate-950/40 p-4 ${styles}`}><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</div><p className="mt-4 text-sm text-slate-400">其中 <span className="font-semibold text-amber-100">{helpSoon}</span> 位希望近期協助</p></section>;
}
