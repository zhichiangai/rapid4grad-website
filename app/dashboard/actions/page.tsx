import { redirect } from "next/navigation";
import { StudentActionCenter } from "@/components/meeting-actions/StudentActionCenter";
import { loadStudentActions } from "@/lib/meeting-actions/action-data";
import { requireStudentWorkspace } from "@/lib/auth/authorization";
import { resolveStudentCapabilities } from "@/lib/student/capabilities";

export default async function StudentActionsPage() {
  const context = await requireStudentWorkspace("/dashboard/actions");
  if (context.profile.role !== "student") redirect("/dashboard");
  const [actions, capabilities] = await Promise.all([
    loadStudentActions(context.supabase, context.user.id),
    resolveStudentCapabilities(context.supabase, context.user.id),
  ]);
  return <StudentActionCenter actions={actions} userId={context.user.id} canWrite={capabilities.personal.actions} activeLabId={capabilities.lab.labId} />;
}
