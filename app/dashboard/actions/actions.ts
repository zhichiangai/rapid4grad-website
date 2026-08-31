"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireActiveUser } from "@/lib/auth/authorization";
import type { ActionStatus } from "@/lib/meeting-actions/action-domain";

export type MeetingActionState = { status: "idle" | "success" | "error"; message: string };
const initialState: MeetingActionState = { status: "idle", message: "" };
const TITLE_MAX = 500;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function value(formData: FormData, key: string, max: number) {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > max ? null : trimmed;
}

function failure(message = "儲存失敗，請稍後再試。"): MeetingActionState { return { status: "error", message }; }
function success(message: string): MeetingActionState { return { status: "success", message }; }
function validDueDate(valueToCheck: string | null) { return valueToCheck === null || valueToCheck === "" || DATE_PATTERN.test(valueToCheck); }
function revalidateActionPaths(labId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/actions");
  revalidatePath("/dashboard/meetings");
  revalidatePath("/professor/dashboard");
  if (labId) revalidatePath(`/professor/labs/${labId}/meetings`);
}

export async function createMeetingAction(_previousState: MeetingActionState = initialState, formData: FormData): Promise<MeetingActionState> {
  void _previousState;
  const context = await requireActiveUser("/dashboard/actions");
  if (context.profile.role !== "student" && context.profile.role !== "professor") return failure("目前無法建立這項 Action，請重新整理後再試。");
  const meetingId = value(formData, "meeting_id", 80);
  const title = value(formData, "title", TITLE_MAX);
  const dueDate = value(formData, "due_date", 20);
  const ownerChoice = value(formData, "owner_choice", 16);
  if (!meetingId || !title || !title.length) return failure("請填寫下一步行動。");
  if (!validDueDate(dueDate)) return failure("請輸入有效的截止日期。");

  const supabase = context.supabase as unknown as SupabaseClient;
  const { data: meeting, error } = await supabase.from("meetings").select("id,lab_id,student_user_id,status").eq("id", meetingId).maybeSingle();
  if (error || !meeting || meeting.status !== "completed") return failure("目前無法在這筆 Meeting 建立 Action。");

  let ownerType: "student" | "supervisor" = "student";
  let ownerUserId = context.user.id;
  if (context.profile.role !== "student") {
    if (ownerChoice === "self") {
      ownerType = "supervisor";
      ownerUserId = context.user.id;
    } else if (ownerChoice !== "student") {
      return failure("請選擇負責人。");
    } else {
      ownerUserId = meeting.student_user_id;
    }
  } else if (meeting.student_user_id !== context.user.id) {
    return failure("目前無法在這筆 Meeting 建立 Action。");
  }

  const result = await supabase.from("meeting_actions").insert({ meeting_id: meeting.id, lab_id: meeting.lab_id, student_user_id: meeting.student_user_id, title, owner_type: ownerType, owner_user_id: ownerUserId, due_date: dueDate || null, status: "todo", completed_at: null }).select("id").maybeSingle();
  if (result.error || !result.data) {
    console.error("[meeting-actions] create failed", { operation: "create", code: result.error?.code });
    return failure(result.error?.code === "42501" ? "目前無法建立這項 Action，請重新整理後再試。" : undefined);
  }
  revalidateActionPaths(meeting.lab_id);
  return success(context.profile.role === "student" ? "✓ 下一步已建立" : "✓ Meeting Action 已建立");
}

function allowedTransition(current: ActionStatus, next: ActionStatus) {
  if (current === "done" || current === "canceled") return false;
  return ["todo", "doing", "done", "canceled"].includes(next);
}

export async function updateMeetingAction(_previousState: MeetingActionState = initialState, formData: FormData): Promise<MeetingActionState> {
  void _previousState;
  const context = await requireActiveUser("/dashboard/actions");
  const actionId = value(formData, "action_id", 80);
  const intent = value(formData, "intent", 16);
  const expectedUpdatedAt = value(formData, "expected_updated_at", 80);
  if (!actionId || !intent || !expectedUpdatedAt) return failure("目前無法修改這項 Action，請重新整理後再試。");
  const supabase = context.supabase as unknown as SupabaseClient;
  const currentResult = await supabase.from("meeting_actions").select("id,lab_id,title,due_date,status,owner_type,owner_user_id,updated_at").eq("id", actionId).maybeSingle();
  const current = currentResult.data as { id: string; lab_id: string; title: string; due_date: string | null; status: ActionStatus; owner_type: "student" | "supervisor"; owner_user_id: string; updated_at: string } | null;
  if (currentResult.error || !current || current.updated_at !== expectedUpdatedAt) return failure("這項 Action 已被其他人更新，請重新整理後再試。");
  const nextStatus = intent === "start" ? "doing" : intent === "todo" ? "todo" : intent === "done" ? "done" : intent === "cancel" ? "canceled" : current.status;
  if (!allowedTransition(current.status, nextStatus)) return failure("目前無法修改這項 Action，請重新整理後再試。");
  const title = intent === "edit" ? value(formData, "title", TITLE_MAX) : current.title;
  const dueDate = intent === "edit" ? value(formData, "due_date", 20) : current.due_date;
  if (!title || !title.length) return failure("請填寫下一步行動。");
  if (!validDueDate(dueDate)) return failure("請輸入有效的截止日期。");
  const result = await supabase.from("meeting_actions").update({ title, due_date: dueDate || null, status: nextStatus, completed_at: nextStatus === "done" ? new Date().toISOString() : null }).eq("id", actionId).eq("updated_at", expectedUpdatedAt).select("id").maybeSingle();
  if (result.error || !result.data) {
    console.error("[meeting-actions] update failed", { operation: intent, actionId, code: result.error?.code });
    return failure(result.error?.code === "42501" ? "目前無法修改這項 Action，請重新整理後再試。" : undefined);
  }
  revalidateActionPaths(current.lab_id);
  const messages: Record<string, string> = { start: "✓ 已開始進行", todo: "✓ 已設為待完成", done: "✓ Action 已完成", edit: "✓ Action 已更新", cancel: "✓ Action 已取消" };
  return success(messages[intent] ?? "✓ Action 已更新");
}
