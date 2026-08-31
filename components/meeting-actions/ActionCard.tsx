"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateMeetingAction } from "@/app/dashboard/actions/actions";
import { actionOwnerLabel, isOpenAction, isActionOverdue, type MeetingActionRecord } from "@/lib/meeting-actions/action-domain";
import { ActionEditForm } from "@/components/meeting-actions/ActionEditForm";
import { ActionStatusBadge } from "@/components/meeting-actions/ActionStatusBadge";

export function ActionCard({ action, userId, canWrite, studentView = false, activeLabId }: { action: MeetingActionRecord; userId: string; canWrite: boolean; studentView?: boolean; activeLabId?: string | null }) {
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const studentOwned = action.owner_type === "student" && action.owner_user_id === userId;
  const canEdit = canWrite && (!studentView || (studentOwned && (!activeLabId || action.lab_id === activeLabId)));
  const submitIntent = (intent: string) => {
    const data = new FormData();
    data.set("action_id", action.id);
    data.set("intent", intent);
    data.set("expected_updated_at", action.updated_at);
    startTransition(async () => {
      const result = await updateMeetingAction(undefined, data);
      setFeedback(result.message);
      if (result.status === "success") {
        router.refresh();
      }
    });
  };
  return <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="break-words font-semibold text-white">{action.title}</p><div className="mt-2 flex flex-wrap items-center gap-2"><ActionStatusBadge status={action.status} />{isActionOverdue(action) ? <span className="text-xs font-semibold text-amber-200">已逾期</span> : null}</div></div><p className="shrink-0 text-sm text-slate-400">{actionOwnerLabel(action, userId)}</p></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span>{action.due_date ? `截止 ${action.due_date}` : "未設定截止日"}</span>{action.meeting_at ? <span>Meeting {new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "2-digit", day: "2-digit" }).format(new Date(action.meeting_at))}</span> : null}{action.lab_name ? <span>{action.lab_name}</span> : null}</div>{studentView && !studentOwned ? <p className="mt-3 text-sm text-slate-500">這項行動由研究指導端負責，目前僅供查看。</p> : null}{!studentView && !canWrite ? <p className="mt-3 text-sm text-amber-100">目前為唯讀模式，無法新增或修改 Action。</p> : null}{feedback ? <p className="mt-3 text-sm text-slate-300" role="status">{feedback}</p> : null}<div className="mt-4 flex flex-wrap items-center gap-2"><Link href="/dashboard/meetings" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">查看 Meeting</Link>{canEdit && isOpenAction(action) ? <><button type="button" disabled={isPending} onClick={() => submitIntent(action.status === "doing" ? "todo" : "start")} className="rounded-xl border border-blue-300/20 px-3 py-2 text-xs font-semibold text-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:opacity-50">{isPending ? "更新中..." : action.status === "doing" ? "設為待完成" : "開始進行"}</button><button type="button" disabled={isPending} onClick={() => submitIntent("done")} className="rounded-xl bg-emerald-500/80 px-3 py-2 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:opacity-50">完成</button><button type="button" disabled={isPending} onClick={() => setEditing(!editing)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:opacity-50">編輯</button>{confirmCancel ? <span className="flex flex-wrap items-center gap-2 rounded-xl border border-red-300/20 bg-red-400/10 p-2 text-xs text-red-100"><span>確定取消這項 Action？</span><button type="button" disabled={isPending} onClick={() => submitIntent("cancel")} className="font-semibold underline">確認取消</button><button type="button" disabled={isPending} onClick={() => setConfirmCancel(false)} className="font-semibold underline">返回</button></span> : <button type="button" disabled={isPending} onClick={() => setConfirmCancel(true)} className="rounded-xl border border-red-300/20 px-3 py-2 text-xs font-semibold text-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:opacity-50">取消</button>}</> : null}</div>{editing ? <ActionEditForm action={action} /> : null}</article>;
}
