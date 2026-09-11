import Link from "next/link";
import type { ProfessorMilestonePreview, ProfessorNextAction, ProfessorThisWeekMeeting, ProfessorWeeklyDigest as Digest } from "@/lib/professor/attention-data";

function formatMeeting(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ProfessorNextAction({ action }: { action: ProfessorNextAction | null }) {
  return (
    <section className="rounded-[2rem] border border-cyan-300/25 bg-cyan-400/[0.08] p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Professor Next Action</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">下一個最值得做的指導動作</h2>
      {action ? (
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-cyan-50">{action.label} · {action.studentName}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{action.reason}</p>
          </div>
          <Link href={`/professor/labs/${action.labId}/students/${action.studentId}`} className="inline-flex shrink-0 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80">開啟 Student Supervision</Link>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-slate-300">目前沒有需要優先介入的授權 Lab 資料。</p>
      )}
    </section>
  );
}

export function ProfessorWeeklyDigest({ digest }: { digest: Digest }) {
  const values = [
    ["Active students", digest.activeStudents, "border-cyan-300/20 text-cyan-100"],
    ["Lab Weekly 已更新", digest.weeklyUpdated, "border-emerald-300/20 text-emerald-100"],
    ["目前卡點", digest.currentBlockers, "border-red-300/20 text-red-100"],
    ["逾期 Meeting Actions", digest.overdueActions, "border-amber-300/20 text-amber-100"],
  ] as const;
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Weekly Digest</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">本週研究指導摘要</h2>
        </div>
        <p className="text-sm text-slate-400">本週 Meetings：{digest.meetingsThisWeek}</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {values.map(([label, value, styles]) => (
          <div key={label} className={`rounded-2xl border bg-slate-950/40 p-4 ${styles}`}>
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProfessorMilestonePreview({ milestones }: { milestones: ProfessorMilestonePreview[] }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Lab Milestone Preview</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">近期研究里程碑</h2>
        </div>
        <p className="text-sm text-slate-400">只顯示最近的 active milestones</p>
      </div>
      {milestones.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {milestones.slice(0, 8).map((milestone) => (
            <Link key={milestone.id} href={`/professor/labs/${milestone.labId}`} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 transition hover:border-cyan-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">
              <p className="font-semibold text-white">{milestone.title}</p>
              <p className="mt-2 text-sm text-slate-400">{milestone.labName} · 目標 {milestone.targetDate}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-5 text-sm text-slate-400">目前沒有近期 active Lab milestone。</p>
      )}
    </section>
  );
}

export function ProfessorThisWeekMeetings({ meetings }: { meetings: ProfessorThisWeekMeeting[] }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">This Week Meetings</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">本週 Meeting</h2>
        </div>
        <p className="text-sm text-slate-400">{meetings.length} 場授權 Lab Meeting</p>
      </div>
      {meetings.length ? (
        <div className="mt-5 divide-y divide-white/10">
          {meetings.slice(0, 6).map((meeting) => (
            <div key={meeting.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-white">{meeting.studentName}</p>
                <p className="mt-1 text-sm text-slate-400">{formatMeeting(meeting.meetingAt)} · {meeting.labName}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${meeting.status === "completed" ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" : "border-cyan-300/20 bg-cyan-400/10 text-cyan-100"}`}>{meeting.status === "completed" ? "已完成" : "已安排"}</span>
                <Link href={`/professor/labs/${meeting.labId}/students/${meeting.studentId}`} className="text-sm font-semibold text-cyan-100 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">Student Supervision</Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-5 text-sm text-slate-400">本週尚無已安排或已完成的授權 Lab Meeting。</p>
      )}
    </section>
  );
}
