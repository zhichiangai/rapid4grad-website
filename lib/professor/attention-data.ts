import type { SupabaseClient } from "@supabase/supabase-js";
import { createV2AdminClient } from "@/lib/supabase/server";
import { deriveAttention, sortAttentionStudents, type AttentionStudent, type AttentionWeekly } from "@/lib/professor/attention";
import { getTaipeiDate, getTaipeiMonday } from "@/lib/supervision/week";

type LabRow = { id: string; name: string; owner_professor_id: string };
type MembershipRow = { lab_id: string; user_id: string; joined_at: string };
type ProfileRow = { id: string; email: string; full_name: string | null; degree: string | null; research_area: string | null };
type WeeklyRow = { id: string; lab_id: string; student_user_id: string; week_start: string; completed_summary: string; blockers: string | null; next_plan: string; self_status: string; needs_professor_help: string; updated_at: string };
type MeetingRow = { id: string; lab_id: string; student_user_id: string; meeting_at: string; status: string };
type ActionRow = { id: string; lab_id: string; student_user_id: string; due_date: string | null; status: string };
type SummaryRow = { student_user_id: string; risk_level: "low" | "medium" | "high" | null; completed_at: string | null; created_at: string };

export type ProfessorAttentionData = {
  students: AttentionStudent[];
  generatedAt: string;
  currentWeekStart: string;
};

function latestByStudent<T extends { student_user_id: string; lab_id: string }>(rows: T[], compare: (a: T, b: T) => number) {
  const result = new Map<string, T>();
  for (const row of rows) {
    const key = `${row.lab_id}:${row.student_user_id}`;
    const previous = result.get(key);
    if (!previous || compare(row, previous) > 0) result.set(key, row);
  }
  return result;
}

function toWeekly(row: WeeklyRow | undefined): AttentionWeekly | null {
  return row
    ? {
        weekStart: row.week_start,
        completedSummary: row.completed_summary,
        blockers: row.blockers,
        nextPlan: row.next_plan,
        selfStatus: row.self_status,
        needsProfessorHelp: row.needs_professor_help,
        updatedAt: row.updated_at,
      }
    : null;
}

export async function loadProfessorAttentionData({
  userId,
  role,
  supabase,
}: {
  userId: string;
  role: "professor" | "admin";
  supabase: SupabaseClient;
}): Promise<ProfessorAttentionData> {
  const now = new Date();
  const currentWeekStart = getTaipeiMonday(now);
  if (role === "admin") return { students: [], generatedAt: now.toISOString(), currentWeekStart };

  const admin = createV2AdminClient();
  const { data: ownedLabs } = await admin
    .from("labs")
    .select("id,name,owner_professor_id")
    .eq("owner_professor_id", userId)
    .eq("status", "active")
    .returns<LabRow[]>();
  const { data: memberLabs } = await admin
    .from("lab_memberships")
    .select("lab_id,user_id,joined_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("role", ["professor", "assistant"])
    .returns<MembershipRow[]>();
  const labIds = [...new Set([...(ownedLabs ?? []).map((lab) => lab.id), ...(memberLabs ?? []).map((row) => row.lab_id)])];
  if (labIds.length === 0) return { students: [], generatedAt: now.toISOString(), currentWeekStart };

  const { data: labs } = await admin.from("labs").select("id,name,owner_professor_id").in("id", labIds).eq("status", "active").returns<LabRow[]>();
  const { data: memberships } = await admin.from("lab_memberships").select("lab_id,user_id,joined_at").in("lab_id", labIds).eq("role", "student").eq("status", "active").returns<MembershipRow[]>();
  const activeMemberships = memberships ?? [];
  const studentIds = [...new Set(activeMemberships.map((row) => row.user_id))];
  if (studentIds.length === 0) return { students: [], generatedAt: now.toISOString(), currentWeekStart };
  const { data: profiles } = await admin.from("profiles").select("id,email,full_name,degree,research_area").in("id", studentIds).returns<ProfileRow[]>();

  // These three reads use the authenticated RLS client. The admin client above only resolves the existing Lab roster.
  const [weeklyResponse, meetingsResponse, actionsResponse, summaries] = await Promise.all([
    supabase.from("weekly_updates").select("id,lab_id,student_user_id,week_start,completed_summary,blockers,next_plan,self_status,needs_professor_help,updated_at").in("lab_id", labIds).in("student_user_id", studentIds).returns<WeeklyRow[]>(),
    supabase.from("meetings").select("id,lab_id,student_user_id,meeting_at,status").in("lab_id", labIds).in("student_user_id", studentIds).returns<MeetingRow[]>(),
    supabase.from("meeting_actions").select("id,lab_id,student_user_id,due_date,status").in("lab_id", labIds).in("student_user_id", studentIds).returns<ActionRow[]>(),
    Promise.all(labIds.map((labId) => supabase.rpc("get_shared_audit_summaries", { target_lab_id: labId }))),
  ]);
  if (weeklyResponse.error || meetingsResponse.error || actionsResponse.error) {
    console.error("Professor attention supervision lookup failed", { code: weeklyResponse.error?.code ?? meetingsResponse.error?.code ?? actionsResponse.error?.code });
    return { students: [], generatedAt: now.toISOString(), currentWeekStart };
  }

  const latestWeekly = latestByStudent(weeklyResponse.data ?? [], (a, b) => a.updated_at.localeCompare(b.updated_at));
  const meetingRows = meetingsResponse.data ?? [];
  const actionRows = actionsResponse.data ?? [];
  const summaryRows = summaries.flatMap((response, index) =>
    ((response.data ?? []) as SummaryRow[]).map((row) => ({ ...row, lab_id: labIds[index] })),
  );
  const latestSummaries = latestByStudent(summaryRows, (a, b) => (a.completed_at ?? a.created_at).localeCompare(b.completed_at ?? b.created_at));
  const today = getTaipeiDate(now);
  const soonDate = new Date(`${today}T00:00:00Z`);
  soonDate.setUTCDate(soonDate.getUTCDate() + 14);
  const soonDateString = soonDate.toISOString().slice(0, 10);
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const labById = new Map((labs ?? []).map((lab) => [lab.id, lab]));
  const students = activeMemberships.flatMap((membership) => {
    const profile = profileById.get(membership.user_id);
    const lab = labById.get(membership.lab_id);
    if (!profile || !lab) return [];
    const studentMeetings = meetingRows.filter((row) => row.student_user_id === membership.user_id && row.lab_id === membership.lab_id);
    const studentActions = actionRows.filter((row) => row.student_user_id === membership.user_id && row.lab_id === membership.lab_id);
    const scheduled = studentMeetings.filter((row) => row.status === "scheduled" && new Date(row.meeting_at).getTime() > now.getTime()).sort((a, b) => a.meeting_at.localeCompare(b.meeting_at));
    const completed = studentMeetings.filter((row) => row.status === "completed").sort((a, b) => b.meeting_at.localeCompare(a.meeting_at));
    const overdueActionCount = studentActions.filter((row) => row.due_date && row.due_date < today && !["done", "canceled"].includes(row.status)).length;
    const deadlineSoonCount = studentActions.filter((row) => row.due_date && row.due_date >= today && row.due_date <= soonDateString && ["todo", "doing"].includes(row.status)).length;
    const summary = latestSummaries.get(`${membership.lab_id}:${membership.user_id}`);
    return [deriveAttention({
      studentId: profile.id,
      labId: lab.id,
      labName: lab.name,
      name: profile.full_name ?? profile.email,
      degree: profile.degree,
      researchArea: profile.research_area,
      joinedAt: membership.joined_at,
      weekly: toWeekly(latestWeekly.get(`${membership.lab_id}:${membership.user_id}`)),
      overdueActionCount,
      deadlineSoonCount,
      nextMeetingAt: scheduled[0]?.meeting_at ?? null,
      lastCompletedMeetingAt: completed[0]?.meeting_at ?? null,
      latestAuditRisk: summary?.risk_level ?? null,
      now,
    })];
  });
  return { students: sortAttentionStudents(students), generatedAt: now.toISOString(), currentWeekStart };
}
