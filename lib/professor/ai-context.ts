import "server-only";

import { loadProfessorAttentionData } from "@/lib/professor/attention-data";
import { loadProfessorStudentSupervision } from "@/lib/professor/student-supervision-data";
import { loadProfessorLabMeetings } from "@/lib/meetings/meeting-data";
import type { ProfessorAiContextType } from "@/lib/professor/ai-contract";
import type { ActiveUserContext } from "@/lib/auth/authorization";

export async function compileProfessorContext({ context, contextType, labId, studentId }: { context: ActiveUserContext; contextType: ProfessorAiContextType; labId?: string | null; studentId?: string | null }) {
  if (contextType === "dashboard") {
    const attention = await loadProfessorAttentionData({ userId: context.user.id, role: context.profile.role === "admin" ? "admin" : "professor", supabase: context.supabase });
    return {
      contextType,
      weeklyDigest: attention.weeklyDigest,
      nextAction: attention.nextAction,
      attention: attention.students.slice(0, 12).map((student) => ({ studentId: student.studentId, labId: student.labId, name: student.name, signals: student.signals, weekly: student.latestWeekly, overdueActionCount: student.overdueActionCount, nextMeetingAt: student.nextMeetingAt })),
      thisWeekMeetings: attention.thisWeekMeetings.slice(0, 12),
      milestones: attention.milestonePreview.slice(0, 8),
    };
  }
  if (!labId) throw new Error("LAB_CONTEXT_REQUIRED");
  if (contextType === "student") {
    if (!studentId) throw new Error("STUDENT_CONTEXT_REQUIRED");
    const data = await loadProfessorStudentSupervision(labId, studentId);
    return {
      contextType,
      lab: { id: data.lab.id, name: data.lab.name },
      student: { id: data.student.id, name: data.student.full_name ?? data.student.email, researchArea: data.student.research_area, degree: data.student.degree },
      weekly: data.weekly,
      meetings: data.meetings.slice(0, 8).map((meeting) => ({ id: meeting.id, meetingAt: meeting.meeting_at, status: meeting.status, summary: meeting.summary, decisions: meeting.decisions })),
      actions: data.actions.slice(0, 16).map((action) => ({ id: action.id, meetingId: action.meeting_id, title: action.title, status: action.status, dueDate: action.due_date, ownerType: action.owner_type })),
      sharedSummaries: data.summaries.slice(0, 5).map((summary) => ({ summary: summary.summary, riskLevel: summary.risk_level, issueTags: summary.issue_tags })),
    };
  }
  const data = await loadProfessorLabMeetings(labId);
  if (!data.authorized || !data.lab) throw new Error("LAB_ACCESS_DENIED");
  return {
    contextType,
    lab: data.lab,
    meetings: data.meetings.slice(0, 12).map((meeting) => ({ id: meeting.id, studentId: meeting.student_user_id, studentName: meeting.student_name, meetingAt: meeting.meeting_at, status: meeting.status, summary: meeting.summary, decisions: meeting.decisions })),
    actions: data.actions.slice(0, 24).map((action) => ({ id: action.id, meetingId: action.meeting_id, studentId: action.student_user_id, title: action.title, status: action.status, dueDate: action.due_date })),
    members: data.students,
  };
}
