import Link from "next/link";
import { ProfessorAttentionCard } from "@/components/professor/ProfessorAttentionCard";
import type { AttentionStudent } from "@/lib/professor/attention";

export function ProfessorAttentionSummary({ students, generatedAt, full = false }: { students: AttentionStudent[]; generatedAt: string; full?: boolean }) {
  const urgent = students.filter((student) => student.severity === "urgent");
  const attention = students.filter((student) => student.severity === "attention");
  const visible = full ? [...urgent, ...attention] : [...urgent, ...attention].slice(0, 5);
  return (
    <section className="rounded-[2rem] border border-cyan-300/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.13),transparent_38%),rgba(15,23,42,0.72)] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Professor Attention</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{full ? "需要注意的學生" : "現在需要你注意"}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">RAPID 依學生最近的進度、卡點與指導紀錄，整理出目前最值得你先看的學生。</p>
        </div>
        <div className="text-left sm:text-right"><p className="text-sm text-slate-400">需要注意</p><p className="text-3xl font-semibold text-white">{urgent.length + attention.length} 位</p>{urgent.length > 0 ? <p className="text-xs text-red-200">其中 {urgent.length} 位建議優先處理</p> : null}</div>
      </div>
      {visible.length > 0 ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">{visible.map((student) => <ProfessorAttentionCard key={`${student.labId}:${student.studentId}`} student={student} compact={!full} />)}</div>
      ) : (
        <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-5"><p className="font-semibold text-emerald-100">目前沒有需要立即介入的學生</p><p className="mt-2 text-sm text-emerald-50/75">目前學生的近期研究回報沒有出現明顯警訊。</p></div>
      )}
      {!full && (urgent.length + attention.length) > 5 ? <Link href="/professor/attention" className="mt-5 inline-flex rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">查看全部需要注意的學生</Link> : null}
      <p className="mt-4 text-xs text-slate-500">更新時間：{new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(generatedAt))}</p>
    </section>
  );
}
