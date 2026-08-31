import { redirect } from "next/navigation";
import { StudentActionCenter } from "@/components/meeting-actions/StudentActionCenter";
import { loadStudentActions } from "@/lib/meeting-actions/action-data";
import { requireStudentWorkspace } from "@/lib/auth/authorization";
import { createV2AdminClient } from "@/lib/supabase/server";
import { getMeetingMode } from "@/lib/meetings/meeting-data";

export default async function StudentActionsPage() {
  const context = await requireStudentWorkspace("/dashboard/actions");
  if (context.profile.role !== "student") redirect("/dashboard");
  const [actions, membership] = await Promise.all([
    loadStudentActions(context.supabase, context.user.id),
    context.supabase.from("lab_memberships").select("lab_id,labs(status)").eq("user_id", context.user.id).eq("role", "student").eq("status", "active").limit(1).maybeSingle(),
  ]);
  const labId = membership.data?.lab_id;
  const mode = labId && membership.data?.labs && (membership.data.labs as { status: string }).status === "active"
    ? await getMeetingMode(createV2AdminClient(), labId)
    : "none";
  const canWrite = mode === "functional";
  return <StudentActionCenter actions={actions} userId={context.user.id} canWrite={canWrite} activeLabId={labId ?? null} />;
}
