import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireActiveUser } from "@/lib/auth/authorization";
import { createV2AdminClient } from "@/lib/supabase/server";
import type { MeetingMode, MeetingRecord, MeetingStatus } from "@/lib/meetings/meeting-domain";

type DbClient = SupabaseClient;

type RawMeeting = Omit<MeetingRecord, "lab_name" | "student_name" | "student_email" | "degree" | "research_area">;

function asDbClient(client: unknown) {
  return client as DbClient;
}

function subscriptionMode(subscription: { status: string; current_period_end: string; grace_ends_at?: string | null } | null): MeetingMode {
  if (!subscription) return "none";
  const now = Date.now();
  const active = ["active", "trialing"].includes(subscription.status) && new Date(subscription.current_period_end).getTime() > now;
  const grace = subscription.status === "past_due" && subscription.grace_ends_at && new Date(subscription.grace_ends_at).getTime() > now;
  return active || grace ? "functional" : "read_only";
}

async function getMode(supabase: DbClient, labId: string) {
  const { data } = await supabase
    .from("subscriptions")
    .select("status,current_period_end,grace_ends_at")
    .eq("lab_id", labId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return subscriptionMode(data);
}

async function enrichMeetings(supabase: DbClient, rows: RawMeeting[]) {
  const studentIds = [...new Set(rows.map((row) => row.student_user_id))];
  const labIds = [...new Set(rows.map((row) => row.lab_id))];
  const [profilesResult, labsResult] = await Promise.all([
    studentIds.length ? supabase.from("profiles").select("id,email,full_name,degree,research_area").in("id", studentIds) : Promise.resolve({ data: [] }),
    labIds.length ? supabase.from("labs").select("id,name").in("id", labIds) : Promise.resolve({ data: [] }),
  ]);
  const profiles = new Map((profilesResult.data ?? []).map((profile: { id: string; email: string; full_name: string | null; degree: string | null; research_area: string | null }) => [profile.id, profile]));
  const labs = new Map((labsResult.data ?? []).map((lab: { id: string; name: string }) => [lab.id, lab.name]));
  return rows.map((row) => {
    const profile = profiles.get(row.student_user_id);
    return {
      ...row,
      lab_name: labs.get(row.lab_id),
      student_name: profile?.full_name ?? profile?.email,
      student_email: profile?.email,
      degree: profile?.degree,
      research_area: profile?.research_area,
    } satisfies MeetingRecord;
  });
}

export async function loadStudentMeetings() {
  const context = await requireActiveUser("/dashboard/meetings");
  const supabase = asDbClient(context.supabase);
  const { data: memberships } = await supabase
    .from("lab_memberships")
    .select("lab_id,labs(id,name,status)")
    .eq("user_id", context.user.id)
    .eq("role", "student")
    .eq("status", "active")
    .limit(1);
  const activeMembership = memberships?.[0] as { lab_id: string; labs: { id: string; name: string; status: string } | null } | undefined;
  const activeLab = activeMembership?.labs?.status === "active" ? activeMembership : null;
  const { data, error } = await supabase.from("meetings").select("id,lab_id,student_user_id,meeting_at,status,summary,decisions,next_meeting_at,created_by,created_at,updated_at").eq("student_user_id", context.user.id).order("meeting_at", { ascending: false }).returns<RawMeeting[]>();
  if (error) console.error("[meetings] student read failed", { code: error.code });
  const meetings = await enrichMeetings(supabase, data ?? []);
  return { context, meetings, activeLab, mode: activeLab ? await getMode(createV2AdminClient(), activeLab.lab_id) : "none" as MeetingMode };
}

export async function loadProfessorLabMeetings(labId: string) {
  const context = await requireActiveUser(`/professor/labs/${labId}/meetings`);
  if (context.profile.role !== "professor") return { context, authorized: false as const, meetings: [], students: [], lab: null, mode: "none" as MeetingMode };
  const supabase = asDbClient(context.supabase);
  const { data: lab } = await supabase.from("labs").select("id,name,status,owner_professor_id").eq("id", labId).maybeSingle();
  if (!lab) return { context, authorized: false as const, meetings: [], students: [], lab: null, mode: "none" as MeetingMode };
  const isOwner = lab.owner_professor_id === context.user.id;
  const { data: viewerMembership } = !isOwner ? await supabase.from("lab_memberships").select("role,status").eq("lab_id", labId).eq("user_id", context.user.id).eq("status", "active").in("role", ["professor", "assistant"]).maybeSingle() : { data: true };
  if (!isOwner && !viewerMembership) return { context, authorized: false as const, meetings: [], students: [], lab: null, mode: "none" as MeetingMode };
  const metadataClient = createV2AdminClient();
  const [meetingsResult, studentMemberships] = await Promise.all([
    supabase.from("meetings").select("id,lab_id,student_user_id,meeting_at,status,summary,decisions,next_meeting_at,created_by,created_at,updated_at").eq("lab_id", labId).order("meeting_at", { ascending: true }).returns<RawMeeting[]>(),
    metadataClient.from("lab_memberships").select("user_id").eq("lab_id", labId).eq("role", "student").eq("status", "active"),
  ]);
  if (meetingsResult.error) console.error("[meetings] supervisor read failed", { code: meetingsResult.error.code });
  const studentIds = (studentMemberships.data ?? []).map((row: { user_id: string }) => row.user_id);
  const { data: profiles } = studentIds.length ? await metadataClient.from("profiles").select("id,email,full_name,degree,research_area").in("id", studentIds) : { data: [] };
  const meetings = await enrichMeetings(supabase, meetingsResult.data ?? []);
  return {
    context,
    authorized: true as const,
    lab: lab as { id: string; name: string; status: string; owner_professor_id: string },
    meetings,
    students: (profiles ?? []).map((profile: { id: string; email: string; full_name: string | null; degree: string | null; research_area: string | null }) => ({ id: profile.id, name: profile.full_name ?? profile.email, email: profile.email, degree: profile.degree, researchArea: profile.research_area })),
    mode: lab.status === "active" ? await getMode(createV2AdminClient(), labId) : "read_only",
  };
}

export function isMeetingStatus(value: string): value is MeetingStatus {
  return ["scheduled", "completed", "canceled"].includes(value);
}
