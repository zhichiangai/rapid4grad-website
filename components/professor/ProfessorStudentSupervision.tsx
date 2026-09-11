import Link from "next/link";
import { MeetingActionList } from "@/components/meeting-actions/MeetingActionList";
import { ProfessorAiEntry } from "@/components/professor/ProfessorAiEntry";
import { formatTaipeiMeetingDateTime } from "@/lib/meetings/meeting-time";
import { meetingGroups } from "@/lib/meetings/meeting-domain";
import type { StudentSupervisionData } from "@/lib/professor/student-supervision-data";

function statusLabel(value: string | null) {
  return value === "blocked" ? "目前卡住" : value === "slightly_behind" ? "稍微落後" : value === "on_track" ? "進度正常" : "尚無本週狀態";
}

function statusClass(value: string | null) {
  return value === "blocked" ? "border-red-300/20 bg-red-400/10 text-red-100" : value === "slightly_behind" ? "border-amber-300/20 bg-amber-400/10 text-amber-100" : "border-emerald-300/20 bg-emerald-400/10 text-emerald-100";
}

function meetingStatus(value: string) {
  return value === "completed" ? "已完成" : value === "scheduled" ? "已安排" : "已取消";
}

export function ProfessorStudentSupervision({ data }: { data: StudentSupervisionData }) {
  const groups = meetingGroups(data.meetings);
  const latestCompleted = groups.history.find((meeting) => meeting.status === "completed");
  const nextMeeting = groups.upcoming[0];
  const openActions = data.actions.filter((action) => action.status === "todo" || action.status === "doing");
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Link href={`/professor/labs/${data.lab.id}`} className="text-sm font-semibold text-cyan-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">← 回 {data.lab.name}</Link>
        <header className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_35%),rgba(15,23,42,0.88)] p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200">Student Supervision</p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{data.student.full_name ?? data.student.email}</h1>
              <p className="mt-2 break-words text-sm text-slate-300">{data.student.email} · {data.student.degree ?? "未設定學位"} · {data.student.research_area ?? data.student.department ?? "未設定研究領域"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">Lab：{data.lab.name}</div>
          </div>
          <p className="mt-5 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.05] px-4 py-3 text-sm leading-6 text-cyan-50">這個頁面只顯示已授權的 Lab Weekly、Lab Meeting、Meeting Actions 與既有 shared summary，不包含學生私人 Thesis 或個人 Graduation Risk。</p>
        </header>

        <ProfessorAiEntry contextType="student" labId={data.lab.id} studentId={data.student.id} />

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-cyan-300/15 bg-cyan-400/[0.06] p-5"><p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Lab Weekly</p><p className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${statusClass(data.weekly?.selfStatus ?? null)}`}>{statusLabel(data.weekly?.selfStatus ?? null)}</p></div>
          <div className="rounded-3xl border border-amber-300/15 bg-amber-400/[0.06] p-5"><p className="text-xs uppercase tracking-[0.18em] text-amber-200">Open Actions</p><p className="mt-3 text-2xl font-semibold">{openActions.length}</p></div>
          <div className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.06] p-5"><p className="text-xs uppercase tracking-[0.18em] text-emerald-200">Shared Summaries</p><p className="mt-3 text-2xl font-semibold">{data.summaries.length}</p></div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">Authorized Research State</p>
            <h2 className="mt-2 text-2xl font-semibold">本週 Lab Weekly</h2>
            {data.weekly ? <div className="mt-5 space-y-5 text-sm leading-7"><div><p className="text-xs uppercase tracking-[0.18em] text-slate-500">完成摘要</p><p className="mt-2 whitespace-pre-wrap text-slate-200">{data.weekly.completedSummary}</p></div><div><p className="text-xs uppercase tracking-[0.18em] text-slate-500">目前卡點</p><p className="mt-2 whitespace-pre-wrap text-slate-200">{data.weekly.blockers || "學生未提供卡點。"}</p></div><div><p className="text-xs uppercase tracking-[0.18em] text-slate-500">下一步計畫</p><p className="mt-2 whitespace-pre-wrap text-slate-200">{data.weekly.nextPlan}</p></div><p className="text-xs text-slate-500">更新於 {formatTaipeiMeetingDateTime(data.weekly.updatedAt)}</p></div> : <p className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-5 text-sm leading-6 text-slate-400">目前沒有可供 Professor 讀取的 Lab Weekly。</p>}
          </article>
          <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">Meeting Prep</p>
            <h2 className="mt-2 text-2xl font-semibold">下一次指導準備</h2>
            <dl className="mt-5 space-y-4 text-sm"><div><dt className="text-slate-500">下一場 Meeting</dt><dd className="mt-1 text-slate-200">{nextMeeting ? formatTaipeiMeetingDateTime(nextMeeting.meeting_at) : "尚未安排"}</dd></div><div><dt className="text-slate-500">上一次完成 Meeting</dt><dd className="mt-1 text-slate-200">{latestCompleted ? formatTaipeiMeetingDateTime(latestCompleted.meeting_at) : "尚無紀錄"}</dd></div><div><dt className="text-slate-500">可用事實</dt><dd className="mt-1 leading-6 text-slate-300">{latestCompleted?.decisions || data.weekly?.nextPlan || "目前沒有已授權的討論決定或下一步計畫。"}</dd></div></dl>
            <p className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm leading-6 text-slate-400">Meeting Prep 只整理已授權資料；不推測 Thesis 進度、實驗結果或個人風險。</p>
          </article>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">Meeting History</p><h2 className="mt-2 text-2xl font-semibold">Meeting 與已確認 Action</h2></div><Link href={`/professor/labs/${data.lab.id}/meetings`} className="text-sm font-semibold text-cyan-100 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">開啟 Meeting Center →</Link></div>
          <div className="mt-5 space-y-5">
            {data.meetings.length ? data.meetings.slice(0, 8).map((meeting) => {
              const meetingActions = data.actions.filter((action) => action.meeting_id === meeting.id);
              return <article key={meeting.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-white">{formatTaipeiMeetingDateTime(meeting.meeting_at)}</p><p className="mt-1 text-sm text-slate-400">{meetingStatus(meeting.status)}</p></div><span className="text-xs text-slate-500">{meetingActions.length} 項 Action</span></div>{meeting.status === "completed" ? <><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">{meeting.summary || "尚無摘要"}</p>{meeting.decisions ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">決定：{meeting.decisions}</p> : null}<MeetingActionList meetingId={meeting.id} actions={meetingActions} userId={data.context.user.id} canWrite={data.mode === "functional"} studentView={false} /></> : null}</article>;
            }) : <p className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 text-sm text-slate-400">目前沒有授權的 Lab Meeting。</p>}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">Shared Audit Summary</p>
          <h2 className="mt-2 text-2xl font-semibold">已分享摘要</h2>
          {data.summaries.length ? <div className="mt-5 space-y-3">{data.summaries.slice(0, 5).map((summary) => <article key={summary.job_id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">{summary.risk_level ?? "未標示"}</span><span className="text-xs text-slate-500">{formatTaipeiMeetingDateTime(summary.completed_at ?? summary.created_at)}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{summary.summary}</p></article>)}</div> : <p className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-5 text-sm text-slate-400">目前沒有學生明確分享的 audit summary。</p>}
        </section>
      </div>
    </main>
  );
}
