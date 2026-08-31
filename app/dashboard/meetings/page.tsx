import { MeetingCenter } from "@/components/meetings/MeetingCenter";
import { loadStudentMeetings } from "@/lib/meetings/meeting-data";

export default async function StudentMeetingsPage() {
  const { context, meetings, actions, activeLab, mode } = await loadStudentMeetings();
  if (context.profile.role !== "student") return null;
  return <MeetingCenter meetings={meetings} actions={actions} userId={context.user.id} mode={mode} labId={activeLab?.lab_id} labName={activeLab?.labs?.name} studentView />;
}
