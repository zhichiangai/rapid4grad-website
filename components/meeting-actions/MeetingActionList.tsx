"use client";

import { useState } from "react";
import type { MeetingActionRecord } from "@/lib/meeting-actions/action-domain";
import { ActionCard } from "@/components/meeting-actions/ActionCard";
import { ActionCreateForm } from "@/components/meeting-actions/ActionCreateForm";

export function MeetingActionList({ meetingId, actions, userId, canWrite, studentView }: { meetingId: string; actions: MeetingActionRecord[]; userId: string; canWrite: boolean; studentView: boolean }) {
  const [open, setOpen] = useState(false);
  return <section className="border-t border-white/10 pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Meeting Actions</p><p className="mt-1 text-sm text-slate-400">討論後確認的下一步。</p></div>{canWrite ? <button type="button" onClick={() => setOpen(!open)} className="rounded-xl border border-cyan-300/20 px-3 py-2 text-xs font-semibold text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">{studentView ? "新增下一步" : "新增 Meeting Action"}</button> : null}</div>{open ? <ActionCreateForm meetingId={meetingId} supervisor={!studentView} /> : null}<div className="mt-4 space-y-3">{actions.length ? actions.map((action) => <ActionCard key={action.id} action={action} userId={userId} canWrite={canWrite} studentView={studentView} />) : <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-500">目前還沒有 Meeting Action。</p>}</div></section>;
}
