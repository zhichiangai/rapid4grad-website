"use server";

import { revalidatePath } from "next/cache";
import { requireStudentWorkspace } from "@/lib/auth/authorization";
import { getTaipeiMonday } from "@/lib/supervision/week";
import type { WeeklyHelp, WeeklyStatus } from "@/lib/supervision/weekly-updates";

export type WeeklyActionState = { status: "idle" | "success" | "error"; message: string };

const initialState: WeeklyActionState = { status: "idle", message: "" };
const statuses = new Set<WeeklyStatus>(["on_track", "slightly_behind", "blocked"]);
const helpOptions = new Set<WeeklyHelp>(["none", "next_meeting", "soon"]);

function readText(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length <= maxLength ? trimmed : null;
}

export async function saveWeeklyCheckIn(
  previousState: WeeklyActionState = initialState,
  formData: FormData,
): Promise<WeeklyActionState> {
  void previousState;
  const context = await requireStudentWorkspace("/dashboard/weekly-check-in");
  if (context.profile.role !== "student") {
    return { status: "error", message: "目前無法更新這份研究進度，請重新整理後再試。" };
  }

  const completedSummary = readText(formData, "completed_summary", 2000);
  const blockers = readText(formData, "blockers", 2000);
  const nextPlan = readText(formData, "next_plan", 2000);
  const selfStatus = formData.get("self_status");
  const needsProfessorHelp = formData.get("needs_professor_help");

  if (!completedSummary || !nextPlan) {
    return { status: "error", message: "請填寫本週完成內容與下週計畫。" };
  }
  if (typeof selfStatus !== "string" || !statuses.has(selfStatus as WeeklyStatus)) {
    return { status: "error", message: "請選擇目前研究狀態。" };
  }
  if (typeof needsProfessorHelp !== "string" || !helpOptions.has(needsProfessorHelp as WeeklyHelp)) {
    return { status: "error", message: "請選擇是否需要教授協助。" };
  }
  if (formData.get("completed_summary") && completedSummary.length === 0) {
    return { status: "error", message: "請填寫本週完成內容與下週計畫。" };
  }

  const { data: membership, error: membershipError } = await context.supabase
    .from("lab_memberships")
    .select("lab_id")
    .eq("user_id", context.user.id)
    .eq("role", "student")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    return { status: "error", message: "目前無法更新這份研究進度，請重新整理後再試。" };
  }

  const { error } = await context.supabase.from("weekly_updates").upsert(
    {
      lab_id: membership.lab_id,
      student_user_id: context.user.id,
      week_start: getTaipeiMonday(),
      completed_summary: completedSummary,
      blockers: blockers || null,
      next_plan: nextPlan,
      self_status: selfStatus,
      needs_professor_help: needsProfessorHelp,
    },
    { onConflict: "lab_id,student_user_id,week_start" },
  );

  if (error) {
    console.error("[weekly-check-in] save failed", { code: error.code, operation: "upsert" });
    return { status: "error", message: "儲存失敗，請稍後再試。" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/weekly-check-in");
  return { status: "success", message: "✓ 本週進度已更新" };
}
