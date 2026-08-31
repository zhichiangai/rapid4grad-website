"use server";

import { revalidatePath } from "next/cache";
import { requireStudentWorkspace } from "@/lib/auth/authorization";
import { THESIS_MILESTONES, type ThesisMilestoneKey, type ThesisMilestoneStatus } from "@/lib/thesis-progress/thesis-domain";

export type ThesisActionState = { status: "idle" | "success" | "error"; message: string };
const initialState: ThesisActionState = { status: "idle", message: "" };
const keySet = new Set<string>(THESIS_MILESTONES.map((milestone) => milestone.key));
const statusSet = new Set<ThesisMilestoneStatus>(["not_started", "in_progress", "blocked", "completed"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function read(formData: FormData, key: string, max: number) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : null;
}

export async function saveThesisMilestone(_previousState: ThesisActionState = initialState, formData: FormData): Promise<ThesisActionState> {
  void _previousState;
  const context = await requireStudentWorkspace("/dashboard/thesis");
  if (context.profile.role !== "student") return { status: "error", message: "目前無法更新論文進度，請重新整理後再試。" };
  const key = read(formData, "milestone_key", 40);
  const status = read(formData, "status", 20);
  const targetDate = read(formData, "target_date", 10);
  const note = read(formData, "note", 1000);
  if (!key || !keySet.has(key) || !status || !statusSet.has(status as ThesisMilestoneStatus)) return { status: "error", message: "目前無法更新這個里程碑，請重新整理後再試。" };
  if (targetDate && !datePattern.test(targetDate)) return { status: "error", message: "請輸入有效的目標日期。" };
  if (formData.get("note") !== null && note === null) return { status: "error", message: "備註不能超過 1000 個字元。" };

  const existing = await context.supabase
    .from("thesis_milestones")
    .select("id")
    .eq("student_user_id", context.user.id)
    .eq("milestone_key", key)
    .maybeSingle();
  const result = existing.data
    ? await context.supabase.from("thesis_milestones").update({
        status: status as ThesisMilestoneStatus,
        target_date: targetDate || null,
        note: note || null,
      }).eq("id", existing.data.id)
    : await context.supabase.from("thesis_milestones").insert({
        student_user_id: context.user.id,
        milestone_key: key as ThesisMilestoneKey,
        status: status as ThesisMilestoneStatus,
        target_date: targetDate || null,
        note: note || null,
      });
  const error = existing.error ?? result.error;
  if (error) {
    console.error("[thesis-progress] save failed", { operation: "upsert", code: error.code, milestoneKey: key });
    return { status: "error", message: "儲存失敗，請稍後再試。" };
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/thesis");
  return { status: "success", message: "✓ 論文進度已更新" };
}
