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
type MilestoneRow = { id: string; lab_id: string; title: string; target_date: string; status: string };

export type ProfessorAttentionData = {
  students: AttentionStudent[];
  generatedAt: string;
  currentWeekStart: string;
  thisWeekMeetings: ProfessorThisWeekMeeting[];
  milestonePreview: ProfessorMilestonePreview[];
  weeklyDigest: ProfessorWeeklyDigest;
  nextAction: ProfessorNextAction | null;
};

export type ProfessorThisWeekMeeting = {
  id: string;
  labId: string;
  labName: string;
  studentId: string;
  studentName: string;
  meetingAt: string;
  status: "scheduled" | "completed" | "canceled";
};

export type ProfessorMilestonePreview = {
  id: string;
  labId: string;
  labName: string;
  title: string;
  targetDate: string;
};

export type ProfessorWeeklyDigest = {
  activeStudents: number;
  weeklyUpdated: number;
  currentBlockers: number;
  overdueActions: number;
  meetingsThisWeek: number;
};

export type ProfessorNextAction = {
  studentId: string;
  labId: string;
  studentName: string;
  label: string;
  reason: string;
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
  const empty = {
    students: [],
    generatedAt: now.toISOString(),
    currentWeekStart,
    thisWeekMeetings: [],
    milestonePreview: [],
    weeklyDigest: { activeStudents: 0, weeklyUpdated: 0, currentBlockers: 0, overdueActions: 0, meetingsThisWeek: 0 },
    nextAction: null,
  } satisfies ProfessorAttentionData;
  if (role === "admin") return empty;

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
  if (labIds.length === 0) return empty;

  const { data: labs } = await admin.from("labs").select("id,name,owner_professor_id").in("id", labIds).eq("status", "active").returns<LabRow[]>();
  const { data: memberships } = await admin.from("lab_memberships").select("lab_id,user_id,joined_at").in("lab_id", labIds).eq("role", "student").eq("status", "active").returns<MembershipRow[]>();
  const activeMemberships = memberships ?? [];
  const studentIds = [...new Set(activeMemberships.map((row) => row.user_id))];
  if (studentIds.length === 0) return empty;
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
    return empty;
  }

  const latestWeekly = latestByStudent(weeklyResponse.data ?? [], (a, b) => a.updated_at.localeCompare(b.updated_at));
  const meetingRows = meetingsResponse.data ?? [];
  const actionRows = actionsResponse.data ?? [];
  const summaryRows = summaries.flatMap((response, index) =>
    ((response.data ?? []) as SummaryRow[]).map((row) => ({ ...row, lab_id: labIds[index] })),
  );
  const latestSummaries = latestByStudent(summaryRows, (a, b) => (a.completed_at ?? a.created_at).localeCompare(b.completed_at ?? b.created_at));
  const today = getTaipeiDate(now);
  const nextWeekStart = new Date(`${currentWeekStart}T00:00:00Z`);
  nextWeekStart.setUTCDate(nextWeekStart.getUTCDate() + 7);
  const nextWeekStartString = nextWeekStart.toISOString().slice(0, 10);
  const weekStartAt = new Date(`${currentWeekStart}T00:00:00+08:00`).getTime();
  const nextWeekStartAt = new Date(`${nextWeekStartString}T00:00:00+08:00`).getTime();
  const soonDate = new Date(`${today}T00:00:00Z`);
  soonDate.setUTCDate(soonDate.getUTCDate() + 14);
  const soonDateString = soonDate.toISOString().slice(0, 10);
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const labById = new Map((labs ?? []).map((lab) => [lab.id, lab]));
  const planningAdmin = admin as unknown as SupabaseClient;
  const { data: milestoneRows } = await planningAdmin
    .from("lab_milestones")
    .select("id,lab_id,title,target_date,status")
    .in("lab_id", labIds)
    .eq("status", "active")
    .gte("target_date", today)
    .order("target_date", { ascending: true })
    .limit(8)
    .returns<MilestoneRow[]>();
  const milestonePreview = (milestoneRows ?? []).flatMap((milestone) => {
    const lab = labById.get(milestone.lab_id);
    return lab ? [{ id: milestone.id, labId: milestone.lab_id, labName: lab.name, title: milestone.title, targetDate: milestone.target_date }] : [];
  });
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
  const sortedStudents = sortAttentionStudents(students);
  const thisWeekMeetings = meetingRows
    .filter((meeting) => {
      const meetingAt = new Date(meeting.meeting_at).getTime();
      return meetingAt >= weekStartAt && meetingAt < nextWeekStartAt;
    })
    .filter((meeting) => meeting.status === "scheduled" || meeting.status === "completed")
    .flatMap((meeting) => {
      const lab = labById.get(meeting.lab_id);
      const profile = profileById.get(meeting.student_user_id);
      if (!lab || !profile) return [];
      return [{
        id: meeting.id,
        labId: meeting.lab_id,
        labName: lab.name,
        studentId: meeting.student_user_id,
        studentName: profile.full_name ?? profile.email,
        meetingAt: meeting.meeting_at,
        status: meeting.status as ProfessorThisWeekMeeting["status"],
      }];
    })
    .sort((left, right) => left.meetingAt.localeCompare(right.meetingAt));
  const digest: ProfessorWeeklyDigest = {
    activeStudents: sortedStudents.length,
    weeklyUpdated: sortedStudents.filter((student) => student.latestWeekly?.weekStart === currentWeekStart).length,
    currentBlockers: sortedStudents.filter((student) => student.latestWeekly?.selfStatus === "blocked").length,
    overdueActions: sortedStudents.reduce((total, student) => total + student.overdueActionCount, 0),
    meetingsThisWeek: thisWeekMeetings.length,
  };
  const candidate = sortedStudents.find((student) => student.signals.length > 0);
  const nextAction = candidate
    ? {
        studentId: candidate.studentId,
        labId: candidate.labId,
        studentName: candidate.name,
        label: candidate.signals.includes("overdue_action")
          ? "跟進逾期 Meeting Action"
          : candidate.signals.includes("blocked") || candidate.signals.includes("help_soon")
            ? "準備下一次研究 Meeting"
            : "查看本週研究回報",
        reason: candidate.signals.includes("overdue_action")
          ? `${candidate.name} 有 ${candidate.overdueActionCount} 項逾期 Action。`
          : candidate.signals.includes("blocked")
            ? `${candidate.name} 的 Lab Weekly 標記為目前卡住。`
            : candidate.signals.includes("help_soon")
              ? `${candidate.name} 在 Lab Weekly 表示近期需要協助。`
              : `${candidate.name} 的授權 Lab 資料需要你先查看。`,
      }
    : null;
  return { students: sortedStudents, generatedAt: now.toISOString(), currentWeekStart, thisWeekMeetings, milestonePreview, weeklyDigest: digest, nextAction };
}
