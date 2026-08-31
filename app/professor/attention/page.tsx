import Link from "next/link";
import { ProfessorAttentionSummary } from "@/components/professor/ProfessorAttentionSummary";
import { ProfessorThisWeek } from "@/components/professor/ProfessorThisWeek";
import { ProfessorUpcomingMeetings } from "@/components/professor/ProfessorUpcomingMeetings";
import { requireProfessorWorkspace } from "@/lib/auth/authorization";
import { loadProfessorAttentionData } from "@/lib/professor/attention-data";

export default async function ProfessorAttentionPage() {
  const context = await requireProfessorWorkspace("/professor/attention");
  const data = await loadProfessorAttentionData({
    userId: context.user.id,
    role: context.profile.role === "admin" ? "admin" : "professor",
    supabase: context.supabase,
  });

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_36%),rgba(15,23,42,0.86)] p-6 shadow-2xl shadow-blue-950/30">
          <Link href="/professor/dashboard" className="text-sm font-semibold text-cyan-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">← 回到研究指導工作台</Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200">Professor Attention Center</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">需要注意的學生</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">只顯示你有權限指導的 active Lab 學生，依研究回報、行動項目、Meeting 與已分享摘要整理。</p>
        </header>
        <ProfessorAttentionSummary students={data.students} generatedAt={data.generatedAt} full />
        <ProfessorThisWeek students={data.students} weekStart={data.currentWeekStart} />
        <ProfessorUpcomingMeetings students={data.students} />
      </div>
    </main>
  );
}
