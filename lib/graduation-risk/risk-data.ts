import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireStudentWorkspace } from "@/lib/auth/authorization";
import type { RiskAction, RiskMeeting, RiskThesisMilestone, RiskWeekly } from "@/lib/graduation-risk/risk-domain";

type RiskClient = SupabaseClient;

export async function loadStudentGraduationRisk() {
  const context = await requireStudentWorkspace("/dashboard/graduation-risk");
  if (context.profile.role !== "student") return { context, allowed: false as const };
  const supabase = context.supabase as unknown as RiskClient;

  const [membershipResult, thesisResult] = await Promise.all([
    supabase.from("lab_memberships").select("lab_id,joined_at,labs(status)").eq("user_id", context.user.id).eq("role", "student").eq("status", "active").limit(1).maybeSingle(),
    supabase.from("thesis_milestones").select("milestone_key,status,target_date").eq("student_user_id", context.user.id),
  ]);
  if (membershipResult.error) console.error("[graduation-risk] membership read failed", { operation: "load", code: membershipResult.error.code });
  if (thesisResult.error) console.error("[graduation-risk] thesis read failed", { operation: "load", code: thesisResult.error.code });

  const membership = membershipResult.data as { lab_id: string; joined_at: string; labs: { status: string } | null } | null;
  const activeLab = membership?.labs?.status === "active" ? { labId: membership.lab_id, joinedAt: membership.joined_at } : null;
  if (!activeLab) {
    return { context, allowed: true as const, activeLab: null, latestWeekly: null, meetings: [] as RiskMeeting[], actions: [] as RiskAction[], thesisMilestones: (thesisResult.data ?? []) as RiskThesisMilestone[], hasThesisRows: (thesisResult.data ?? []).length > 0 };
  }

  const [weeklyResult, meetingsResult, actionsResult] = await Promise.all([
    supabase.from("weekly_updates").select("updated_at").eq("student_user_id", context.user.id).eq("lab_id", activeLab.labId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("meetings").select("status,meeting_at").eq("student_user_id", context.user.id).eq("lab_id", activeLab.labId),
    supabase.from("meeting_actions").select("status,due_date,owner_type,owner_user_id,student_user_id").eq("student_user_id", context.user.id).eq("lab_id", activeLab.labId),
  ]);
  if (weeklyResult.error) console.error("[graduation-risk] weekly read failed", { operation: "load", code: weeklyResult.error.code });
  if (meetingsResult.error) console.error("[graduation-risk] meetings read failed", { operation: "load", code: meetingsResult.error.code });
  if (actionsResult.error) console.error("[graduation-risk] actions read failed", { operation: "load", code: actionsResult.error.code });
  return {
    context,
    allowed: true as const,
    activeLab,
    latestWeekly: (weeklyResult.data ?? null) as RiskWeekly | null,
    meetings: (meetingsResult.data ?? []) as RiskMeeting[],
    actions: (actionsResult.data ?? []) as RiskAction[],
    thesisMilestones: (thesisResult.data ?? []) as RiskThesisMilestone[],
    hasThesisRows: (thesisResult.data ?? []).length > 0,
  };
}
