"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { MeetingMode, MeetingRecord } from "@/lib/meetings/meeting-domain";
import { meetingGroups } from "@/lib/meetings/meeting-domain";
import { MeetingCard } from "@/components/meetings/MeetingCard";
import { MeetingScheduleForm } from "@/components/meetings/MeetingScheduleForm";
import { formatTaipeiMeetingDateTime } from "@/lib/meetings/meeting-time";
import type { MeetingActionRecord } from "@/lib/meeting-actions/action-domain";
import { MeetingActionList } from "@/components/meeting-actions/MeetingActionList";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-4"><h2 className="text-2xl font-semibold text-white">{title}</h2>{children}</section>;
}

function Cards({ meetings, actions, userId, mode, studentView }: { meetings: MeetingRecord[]; actions: MeetingActionRecord[]; userId: string; mode: MeetingMode; studentView: boolean }) {
  if (!meetings.length) return <div className="rounded-3xl border border-white/[0.03] bg-white/[0.03] p-6 text-sm text-slate-400">目前沒有紀錄。</div>;
  return <div className="space-y-3">{meetings.map((meeting) => {
    const meetingActions = actions.filter((action) => action.meeting_id === meeting.id);
    const studentOwnsMeeting = meeting.student_user_id === userId;
    const canWriteActions = studentView ? studentOwnsMeeting && (!meeting.lab_id || mode === "functional") : mode === "functional";
    return <div key={meeting.id}>
      <MeetingCard meeting={meeting} userId={userId} mode={mode} studentView={studentView} />
      {meeting.status === "completed" ? <div className="mt-3 rounded-3xl border border-white/10 bg-white/[0.02] p-5"><MeetingActionList meetingId={meeting.id} actions={meetingActions} userId={userId} canWrite={canWriteActions} studentView={studentView} /></div> : null}
    </div>;
  })}</div>;
}

export function MeetingCenter({ meetings, actions, userId, mode, labId, labName, students, studentView = false }: { meetings: MeetingRecord[]; actions: MeetingActionRecord[]; userId: string; mode: MeetingMode; labId?: string; labName?: string; students?: Array<{ id: string; name: string; email: string }>; studentView?: boolean }) {
  const groups = useMemo(() => meetingGroups(meetings), [meetings]);
  const canWrite = studentView || mode === "functional";
  return <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.15),transparent 34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-10 text-white">
    <div className="mx-auto w-full max-w-6xl space-y-7">
      <Link href={studentView ? "/dashboard" : "/professor/dashboard"} className="text-sm font-semibold text-cyan-200 hover:text-white">← 回工作台</Link>
      <header className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">{studentView ? "RESEARCH MEETINGS" : "RESEARCH SUPERVISION"}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{studentView ? "研究 Meeting" : "Meeting Center"}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{studentView ? "記錄任何研究討論。私人 Meeting 只有你看得到，選擇 Lab 協作後才會分享給有權限的教授。" : `集中查看${labName ? ` ${labName} ` : "這個 Lab 的 "}研究 Meeting，並在討論結束後留下摘要與決定。`}</p>
        {studentView && mode === "read_only" ? <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">Lab 協作目前為唯讀模式；Personal Meeting 仍可新增與修改。</p> : null}
        {!studentView && mode === "read_only" ? <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">目前研究室功能為唯讀模式，無法新增或修改 Meeting 紀錄。</p> : null}
      </header>
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-cyan-300/15 bg-cyan-400/[0.06] p-5"><p className="text-xs uppercase tracking-[0.2em] text-cyan-200">下一場 Meeting</p><p className="mt-3 font-semibold">{groups.upcoming[0] ? formatTaipeiMeetingDateTime(groups.upcoming[0].meeting_at) : "尚未安排"}</p></div>
        <div className="rounded-3xl border border-amber-300/15 bg-amber-400/[0.06] p-5"><p className="text-xs uppercase tracking-[0.2em] text-amber-200">待補紀錄</p><p className="mt-3 font-semibold">{groups.pending.length}</p></div>
        <div className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.06] p-5"><p className="text-xs uppercase tracking-[0.2em] text-emerald-200">已完成 Meeting</p><p className="mt-3 font-semibold">{meetings.filter((meeting) => meeting.status === "completed").length}</p></div>
      </section>
      {studentView && !labId ? <div className="rounded-3xl border border-cyan-300/20 bg-cyan-400/10 p-6 text-sm leading-6 text-cyan-50">目前為 Personal 模式，這裡記錄的 Meeting 只有你自己看得到。之後加入 Lab，可選擇建立協作 Meeting。<Link href="/dashboard/lab-join" className="mt-3 block font-semibold underline">加入 Lab（選填）</Link></div> : null}
      {labId || studentView ? <section id="schedule-meeting" className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Schedule</p><h2 className="mt-2 text-2xl font-semibold">安排下一次 Meeting</h2><div className="mt-5"><MeetingScheduleForm labId={labId} students={students} disabled={!canWrite} studentMode={studentView} labMode={mode} /></div></section> : null}
      {meetings.length ? <><Section title="即將到來的 Meeting"><Cards meetings={groups.upcoming} actions={actions} userId={userId} mode={mode} studentView={studentView} /></Section><Section title="待補 Meeting 紀錄"><Cards meetings={groups.pending} actions={actions} userId={userId} mode={mode} studentView={studentView} /></Section><Section title="Meeting 歷史"><Cards meetings={groups.history} actions={actions} userId={userId} mode={mode} studentView={studentView} /></Section></> : <section className="rounded-3xl border border-cyan-300/20 bg-cyan-400/[0.06] p-7"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">FIRST MEETING</p><h2 className="mt-3 text-2xl font-semibold">先記下下一場和教授討論的 Meeting。</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">建立第一場 Meeting 後，這裡會開始累積你的研究討論紀錄。</p><Link href="#schedule-meeting" className="mt-5 inline-flex rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80">安排第一場 Meeting</Link></section>}
    </div>
  </main>;
}
