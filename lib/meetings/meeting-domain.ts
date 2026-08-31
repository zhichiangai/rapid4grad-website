export type MeetingStatus = "scheduled" | "completed" | "canceled";
export type MeetingMode = "functional" | "read_only" | "none";

export type MeetingRecord = {
  id: string;
  lab_id: string;
  lab_name?: string;
  student_user_id: string;
  student_name?: string;
  student_email?: string;
  degree?: string | null;
  research_area?: string | null;
  meeting_at: string;
  status: MeetingStatus;
  summary: string | null;
  decisions: string | null;
  next_meeting_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function isNonEmptyMeetingSummary(summary: string | null) {
  return Boolean(summary?.trim());
}

export function meetingGroups(meetings: MeetingRecord[], now = new Date()) {
  const upcoming = meetings
    .filter((meeting) => meeting.status === "scheduled" && new Date(meeting.meeting_at).getTime() > now.getTime())
    .sort((a, b) => a.meeting_at.localeCompare(b.meeting_at));
  const pending = meetings
    .filter((meeting) => meeting.status === "scheduled" && new Date(meeting.meeting_at).getTime() <= now.getTime())
    .sort((a, b) => b.meeting_at.localeCompare(a.meeting_at));
  const history = meetings
    .filter((meeting) => meeting.status === "completed" || meeting.status === "canceled")
    .sort((a, b) => b.meeting_at.localeCompare(a.meeting_at))
    .slice(0, 20);
  return { upcoming, pending, history };
}

export function canStudentEdit(meeting: MeetingRecord, userId: string) {
  return meeting.created_by === userId && meeting.student_user_id === userId;
}
