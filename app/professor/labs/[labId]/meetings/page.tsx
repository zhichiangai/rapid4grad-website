import { redirect } from "next/navigation";
import { MeetingCenter } from "@/components/meetings/MeetingCenter";
import { loadProfessorLabMeetings } from "@/lib/meetings/meeting-data";

type Props = { params: Promise<{ labId: string }> };

export default async function ProfessorLabMeetingsPage({ params }: Props) {
  const { labId } = await params;
  const result = await loadProfessorLabMeetings(labId);
  if (!result.authorized || !result.lab) redirect("/professor/dashboard");
  return <MeetingCenter meetings={result.meetings} userId={result.context.user.id} mode={result.mode} labId={result.lab.id} labName={result.lab.name} students={result.students} />;
}
