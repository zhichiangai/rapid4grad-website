import "server-only";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createV2AdminClient } from "@/lib/supabase/server";
import { requireProfessorWorkspace } from "@/lib/auth/authorization";
import { loadActionsForMeetings } from "@/lib/meeting-actions/action-data";
import type { MeetingActionRecord } from "@/lib/meeting-actions/action-domain";
import type { MeetingRecord } from "@/lib/meetings/meeting-domain";
import { getMeetingMode } from "@/lib/meetings/meeting-data";
import type { MeetingMode } from "@/lib/meetings/meeting-domain";
import type { AttentionWeekly } from "@/lib/professor/attention";

type LabRow = { id: string; name: string; institution: string | null; owner_professor_id: string };
type ProfileRow = { id: string; email: string; full_name: string | null; degree: string | null; department: string | null; research_area: string | null; advisor_name: string | null; advisor_style: string | null };
type WeeklyRow = { id: string; lab_id: string; student_user_id: string; week_start: string; completed_summary: string; blockers: string | null; next_plan: string; self_status: string; needs_professor_help: string; updated_at: string };
type SummaryRow = { job_id: string; student_user_id: string; summary: string; risk_level: "low" | "medium" | "high" | null; issue_tags: string[]; completed_at: string | null; created_at: string };
type RawMeeting = Omit<MeetingRecord, "lab_name" | "student_name" | "student_email" | "degree" | "research_area">;

export type StudentSupervisionData = {
  context: Awaited<ReturnType<typeof requireProfessorWorkspace>>;
  lab: LabRow;
  student: ProfileRow;
  weekly: AttentionWeekly | null;
  meetings: MeetingRecord[];
  actions: MeetingActionRecord[];
  summaries: SummaryRow[];
  mode: MeetingMode;
};

function latestWeekly(rows: WeeklyRow[]) {
  return rows.sort((left, right) => right.updated_at.localeCompare(left.updated_at))[0] ?? null;
}

async function loadStudentProfiles(admin: ReturnType<typeof createV2AdminClient>, studentId: string) {
  const { data, error } = await admin.from("profiles").select("id,email,full_name,degree,department,research_area,advisor_name,advisor_style").eq("id", studentId).maybeSingle<ProfileRow>();
  if (error || !data) return null;
  return data;
}

export async function loadProfessorStudentSupervision(labId: string, studentId: string): Promise<StudentSupervisionData> {
  const context = await requireProfessorWorkspace(`/professor/labs/${labId}/students/${studentId}`);
  const admin = createV2AdminClient();
  const { data: lab, error: labError } = await admin.from("labs").select("id,name,institution,owner_professor_id").eq("id", labId).maybeSingle<LabRow>();
  if (labError || !lab) redirect("/professor/dashboard");
  const isOwner = lab.owner_professor_id === context.user.id;
  const isAdmin = context.profile.role === "admin";
  if (!isOwner && !isAdmin) {
    const { data: membership } = await admin.from("lab_memberships").select("id").eq("lab_id", lab.id).eq("user_id", context.user.id).eq("status", "active").in("role", ["professor", "assistant"]).maybeSingle();
    if (!membership) redirect("/professor/dashboard");
  }
  const { data: studentMembership } = await admin.from("lab_memberships").select("id").eq("lab_id", lab.id).eq("user_id", studentId).eq("role", "student").eq("status", "active").maybeSingle();
  if (!studentMembership) redirect(`/professor/labs/${lab.id}`);
  const student = await loadStudentProfiles(admin, studentId);
  if (!student) redirect(`/professor/labs/${lab.id}`);
  const supabase = context.supabase as unknown as SupabaseClient;

  const [weeklyResponse, meetingsResponse, summariesResponse] = await Promise.all([
    supabase.from("weekly_updates").select("id,lab_id,student_user_id,week_start,completed_summary,blockers,next_plan,self_status,needs_professor_help,updated_at").eq("lab_id", lab.id).eq("student_user_id", studentId).order("week_start", { ascending: false }).returns<WeeklyRow[]>(),
    supabase.from("meetings").select("id,lab_id,student_user_id,meeting_at,status,summary,decisions,next_meeting_at,created_by,created_at,updated_at").eq("lab_id", lab.id).eq("student_user_id", studentId).order("meeting_at", { ascending: false }).returns<RawMeeting[]>(),
    supabase.rpc("get_shared_audit_summaries", { target_lab_id: lab.id, target_student_user_id: studentId }),
  ]);
  if (weeklyResponse.error || meetingsResponse.error) {
    console.error("Professor student supervision lookup failed", { code: weeklyResponse.error?.code ?? meetingsResponse.error?.code });
  }
  const meetings = (meetingsResponse.data ?? []) as MeetingRecord[];
  const actions = await loadActionsForMeetings(supabase, meetings);
  const mode = await getMeetingMode(supabase, lab.id);
  const weeklyRow = latestWeekly(weeklyResponse.data ?? []);
  const weekly = weeklyRow ? {
    weekStart: weeklyRow.week_start,
    completedSummary: weeklyRow.completed_summary,
    blockers: weeklyRow.blockers,
    nextPlan: weeklyRow.next_plan,
    selfStatus: weeklyRow.self_status,
    needsProfessorHelp: weeklyRow.needs_professor_help,
    updatedAt: weeklyRow.updated_at,
  } : null;
  return {
    context,
    lab,
    student,
    weekly,
    meetings,
    actions,
    summaries: (summariesResponse.data ?? []) as SummaryRow[],
    mode,
  };
}
