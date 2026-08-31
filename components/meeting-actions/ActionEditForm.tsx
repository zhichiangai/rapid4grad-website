"use client";

import { useActionState } from "react";
import { updateMeetingAction, type MeetingActionState } from "@/app/dashboard/actions/actions";
import type { MeetingActionRecord } from "@/lib/meeting-actions/action-domain";

const initialState: MeetingActionState = { status: "idle", message: "" };

export function ActionEditForm({ action }: { action: MeetingActionRecord }) {
  const [state, formAction, isPending] = useActionState(updateMeetingAction, initialState);
  return <form action={formAction} className="mt-3 space-y-3"><input type="hidden" name="action_id" value={action.id} /><input type="hidden" name="intent" value="edit" /><input type="hidden" name="expected_updated_at" value={action.updated_at} /><label className="block text-sm text-slate-200"><span>下一步</span><textarea name="title" required maxLength={500} defaultValue={action.title} disabled={isPending} className="mt-2 min-h-20 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70" /></label><label className="block text-sm text-slate-200"><span>截止日期（選填）</span><input name="due_date" type="date" defaultValue={action.due_date ?? ""} disabled={isPending} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70" /></label><button type="submit" disabled={isPending} className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:opacity-50">{isPending ? "更新中..." : "儲存修改"}</button>{state.message ? <p role={state.status === "error" ? "alert" : "status"} className={`text-sm ${state.status === "error" ? "text-red-200" : "text-emerald-200"}`}>{state.message}</p> : null}</form>;
}
