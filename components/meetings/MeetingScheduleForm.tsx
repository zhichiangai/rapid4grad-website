"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createMeeting, type MeetingActionState } from "@/app/dashboard/meetings/actions";

const initialState: MeetingActionState = { status: "idle", message: "" };

export function MeetingScheduleForm({ labId, students, disabled, studentMode = false, labMode = "none" }: { labId?: string; students?: Array<{ id: string; name: string; email: string }>; disabled: boolean; studentMode?: boolean; labMode?: "functional" | "read_only" | "none" }) {
  const [state, formAction, isPending] = useActionState(createMeeting, initialState);
  const router = useRouter();
  useEffect(() => { if (state.status === "success") router.refresh(); }, [router, state.status]);
  return (
    <form action={formAction} className="space-y-5">
      {!studentMode ? <label className="block"><span className="text-sm font-semibold text-white">學生</span><select name="student_user_id" required disabled={disabled || isPending} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:opacity-50"><option value="">選擇學生</option>{(students ?? []).map((student) => <option key={student.id} value={student.id}>{student.name} · {student.email}</option>)}</select></label> : null}
      {!studentMode && labId ? <input type="hidden" name="lab_id" value={labId} /> : null}
      {studentMode && labId ? <fieldset><legend className="text-sm font-semibold text-white">Meeting 類型</legend><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-cyan-300/30 bg-cyan-400/[0.06] p-4"><input type="radio" name="meeting_context" value="personal" defaultChecked className="mt-1 accent-cyan-400" disabled={disabled || isPending} /><span><span className="block font-semibold text-white">私人研究紀錄</span><span className="mt-1 block text-xs leading-5 text-slate-400">只有你自己可以查看。</span></span></label><label className={`flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4 ${labMode === "functional" ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}><input type="radio" name="meeting_context" value="lab" className="mt-1 accent-cyan-400" disabled={disabled || isPending || labMode !== "functional"} /><span><span className="block font-semibold text-white">與 Lab 協作</span><span className="mt-1 block text-xs leading-5 text-slate-400">{labMode === "functional" ? "讓有權限的教授 / Assistant 查看。" : "Lab 目前為唯讀，暫時無法建立協作 Meeting。"}</span></span></label></div></fieldset> : null}
      <label className="block"><span className="text-sm font-semibold text-white">Meeting 日期與時間（台北）</span><input name="meeting_at" type="datetime-local" required disabled={disabled || isPending} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:opacity-50" /></label>
      <p className="text-xs leading-5 text-slate-400">私人 Meeting 只有你可以查看；只有主動選擇 Lab 協作時，才會提供給有權限的教授 / Assistant。</p>
      {disabled ? <p className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">目前無法新增 Meeting。</p> : <button type="submit" disabled={isPending} className="w-full rounded-2xl bg-blue-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60">{isPending ? "安排中..." : "安排 Meeting"}</button>}
      {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm ${state.status === "error" ? "border-red-300/20 bg-red-400/10 text-red-100" : "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"}`}>{state.message}</p> : null}
    </form>
  );
}
