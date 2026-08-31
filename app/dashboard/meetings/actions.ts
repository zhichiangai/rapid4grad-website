"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireActiveUser } from "@/lib/auth/authorization";
import { parseTaipeiDateTimeLocal } from "@/lib/meetings/meeting-time";
import { isNonEmptyMeetingSummary } from "@/lib/meetings/meeting-domain";

export type MeetingActionState = { status: "idle" | "success" | "error"; message: string };
const initialState: MeetingActionState = { status: "idle", message: "" };

function text(formData: FormData, key: string, max: number) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : null;
}

function failure(message = "儲存失敗，請稍後再試。"): MeetingActionState {
  return { status: "error", message };
}

function success(message: string): MeetingActionState {
  return { status: "success", message };
}

function revalidateMeetingPaths(labId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/meetings");
  revalidatePath("/professor/dashboard");
  if (labId) revalidatePath(`/professor/labs/${labId}/meetings`);
}

export async function createMeeting(_previousState: MeetingActionState = initialState, formData: FormData): Promise<MeetingActionState> {
  void _previousState;
  const context = await requireActiveUser("/dashboard/meetings");
  const dateTime = text(formData, "meeting_at", 32);
  const meetingAt = dateTime ? parseTaipeiDateTimeLocal(dateTime) : null;
  if (!meetingAt) return failure("請選擇 Meeting 日期與時間。");
  if (meetingAt.getTime() <= Date.now()) return failure("請選擇未來的 Meeting 時間。");

  const supabase = context.supabase;
  let labId = text(formData, "lab_id", 80);
  let studentUserId = text(formData, "student_user_id", 80);
  if (context.profile.role === "student") {
    const { data: membership } = await supabase.from("lab_memberships").select("lab_id").eq("user_id", context.user.id).eq("role", "student").eq("status", "active").limit(1).maybeSingle();
    labId = membership?.lab_id ?? null;
    studentUserId = context.user.id;
  }
  if (!labId || !studentUserId) return failure("目前沒有可安排 Meeting 的研究室。");
  const { error } = await (supabase as unknown as SupabaseClient).from("meetings").insert({ lab_id: labId, student_user_id: studentUserId, meeting_at: meetingAt.toISOString(), status: "scheduled", created_by: context.user.id });
  if (error) {
    console.error("[meetings] create failed", { operation: "create", code: error.code });
    return failure();
  }
  revalidateMeetingPaths(labId);
  return success("✓ Meeting 已安排");
}

export async function updateMeeting(_previousState: MeetingActionState = initialState, formData: FormData): Promise<MeetingActionState> {
  void _previousState;
  const context = await requireActiveUser("/dashboard/meetings");
  const meetingId = text(formData, "meeting_id", 80);
  const intent = text(formData, "intent", 32);
  const expectedUpdatedAt = text(formData, "expected_updated_at", 80);
  if (!meetingId || !intent || !expectedUpdatedAt) return failure("目前無法修改這筆 Meeting，請重新整理後再試。");
  const supabase = context.supabase as unknown as SupabaseClient;
  const currentResult = await supabase.from("meetings").select("id,lab_id,student_user_id,meeting_at,status,created_by,updated_at").eq("id", meetingId).maybeSingle();
  const meeting = currentResult.data as { id: string; lab_id: string; student_user_id: string; meeting_at: string; status: string; created_by: string; updated_at: string } | null;
  if (currentResult.error || !meeting || meeting.updated_at !== expectedUpdatedAt) return failure("這筆 Meeting 已被其他人更新，請重新整理後再試。");
  const updates: Record<string, unknown> = {};
  if (["reschedule", "complete", "edit"].includes(intent)) {
    if (intent === "reschedule") {
      if (meeting.status !== "scheduled") return failure("目前無法修改這筆 Meeting，請重新整理後再試。");
      const value = text(formData, "meeting_at", 32);
      const nextAt = value ? parseTaipeiDateTimeLocal(value) : null;
      if (!nextAt) return failure("請選擇 Meeting 日期與時間。");
      if (nextAt.getTime() <= Date.now()) return failure("請選擇未來的 Meeting 時間。");
      updates.meeting_at = nextAt.toISOString();
    } else {
      const summary = text(formData, "summary", 3000);
      const decisions = text(formData, "decisions", 3000);
      const nextValue = text(formData, "next_meeting_at", 32);
      const nextAt = nextValue ? parseTaipeiDateTimeLocal(nextValue) : null;
      if ((intent === "complete" || intent === "edit") && (!isNonEmptyMeetingSummary(summary) || (intent === "complete" && meeting.status !== "scheduled"))) return isNonEmptyMeetingSummary(summary) ? failure("目前無法修改這筆 Meeting，請重新整理後再試。") : failure("請填寫這次 Meeting 的討論摘要。");
      if (nextValue && (!nextAt || nextAt.getTime() <= new Date(meeting.meeting_at).getTime())) return failure("建議下一次 Meeting 必須晚於本次 Meeting。");
      updates.summary = summary || null;
      updates.decisions = decisions || null;
      updates.next_meeting_at = nextAt?.toISOString() ?? null;
      if (intent === "complete") updates.status = "completed";
      if (intent === "edit" && meeting.status !== "completed") return failure("目前無法修改這筆 Meeting，請重新整理後再試。");
    }
  } else if (intent === "cancel") {
    if (meeting.status !== "scheduled") return failure("目前無法修改這筆 Meeting，請重新整理後再試。");
    updates.status = "canceled";
  } else return failure("目前無法修改這筆 Meeting，請重新整理後再試。");

  const updateResult = await supabase.from("meetings").update(updates).eq("id", meetingId).eq("updated_at", expectedUpdatedAt).select("id").maybeSingle();
  if (updateResult.error || !updateResult.data) {
    console.error("[meetings] update failed", { operation: intent, code: updateResult.error?.code });
    return failure(updateResult.error?.code === "PGRST116" ? "這筆 Meeting 已被其他人更新，請重新整理後再試。" : "目前無法修改這筆 Meeting，請重新整理後再試。");
  }
  revalidateMeetingPaths(meeting.lab_id);
  const messages: Record<string, string> = { complete: "✓ Meeting 紀錄已完成", edit: "✓ Meeting 紀錄已更新", reschedule: "✓ Meeting 時間已更新", cancel: "✓ Meeting 已取消" };
  return success(messages[intent] ?? "✓ Meeting 已更新");
}
