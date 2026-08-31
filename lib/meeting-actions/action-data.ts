import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MeetingActionRecord } from "@/lib/meeting-actions/action-domain";

const ACTION_FIELDS = "id,meeting_id,lab_id,student_user_id,title,owner_type,owner_user_id,due_date,status,completed_at,created_at,updated_at";

type DbClient = SupabaseClient;

export async function loadActionsForMeetings(supabase: DbClient, meetings: Array<{ id: string; lab_id: string; meeting_at: string; student_user_id: string }>) {
  if (!meetings.length) return [] as MeetingActionRecord[];
  const { data, error } = await supabase.from("meeting_actions").select(ACTION_FIELDS).in("meeting_id", meetings.map((meeting) => meeting.id)).order("due_date", { ascending: true, nullsFirst: false }).returns<MeetingActionRecord[]>();
  if (error) {
    console.error("[meeting-actions] read failed", { operation: "list", code: error.code });
    return [];
  }
  const meetingMap = new Map(meetings.map((meeting) => [meeting.id, meeting]));
  return (data ?? []).map((action) => ({ ...action, meeting_at: meetingMap.get(action.meeting_id)?.meeting_at }));
}
export async function loadStudentActions(supabase: DbClient, studentUserId: string) {
  const { data, error } = await supabase.from("meeting_actions").select(ACTION_FIELDS).eq("student_user_id", studentUserId).order("updated_at", { ascending: false }).returns<MeetingActionRecord[]>();
  if (error) {
    console.error("[meeting-actions] read failed", { operation: "student-list", code: error.code });
    return [] as MeetingActionRecord[];
  }
  const meetingIds = [...new Set((data ?? []).map((action) => action.meeting_id))];
  const labIds = [...new Set((data ?? []).map((action) => action.lab_id))];
  const [meetingsResult, labsResult] = await Promise.all([
    meetingIds.length ? supabase.from("meetings").select("id,meeting_at").in("id", meetingIds) : Promise.resolve({ data: [] }),
    labIds.length ? supabase.from("labs").select("id,name").in("id", labIds) : Promise.resolve({ data: [] }),
  ]);
  const meetings = new Map((meetingsResult.data ?? []).map((meeting: { id: string; meeting_at: string }) => [meeting.id, meeting.meeting_at]));
  const labs = new Map((labsResult.data ?? []).map((lab: { id: string; name: string }) => [lab.id, lab.name]));
  return (data ?? []).map((action) => ({ ...action, meeting_at: meetings.get(action.meeting_id), lab_name: labs.get(action.lab_id) }));
}
