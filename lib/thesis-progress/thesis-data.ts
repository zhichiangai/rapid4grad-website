import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeMilestoneDefinitionsWithRows, type ThesisMilestoneRow } from "@/lib/thesis-progress/thesis-domain";

const FIELDS = "id,student_user_id,milestone_key,status,target_date,note,completed_at,created_at,updated_at";

export async function loadStudentThesisProgress(supabase: SupabaseClient, studentUserId: string) {
  const { data, error } = await supabase.from("thesis_milestones").select(FIELDS).eq("student_user_id", studentUserId).order("milestone_key").returns<ThesisMilestoneRow[]>();
  if (error) {
    console.error("[thesis-progress] read failed", { operation: "list", code: error.code });
    return mergeMilestoneDefinitionsWithRows(studentUserId, []);
  }
  return mergeMilestoneDefinitionsWithRows(studentUserId, data ?? []);
}
