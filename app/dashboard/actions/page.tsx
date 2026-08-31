import { redirect } from "next/navigation";
import { StudentActionCenter } from "@/components/meeting-actions/StudentActionCenter";
import { loadStudentActions } from "@/lib/meeting-actions/action-data";
import { requireStudentWorkspace } from "@/lib/auth/authorization";

export default async function StudentActionsPage() {
  const context = await requireStudentWorkspace("/dashboard/actions");
  if (context.profile.role !== "student") redirect("/dashboard");
  const [actions, membership] = await Promise.all([
    loadStudentActions(context.supabase, context.user.id),
    context.supabase.from("lab_memberships").select("lab_id,labs(status)").eq("user_id", context.user.id).eq("role", "student").eq("status", "active").limit(1).maybeSingle(),
  ]);
  const labId = membership.data?.lab_id;
  let canWrite = false;
  if (labId && membership.data?.labs && (membership.data.labs as { status: string }).status === "active") {
    const { data: subscription } = await context.supabase.from("subscriptions").select("status,current_period_end,grace_ends_at").eq("lab_id", labId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const now = Date.now();
    canWrite = Boolean(subscription && (["active", "trialing"].includes(subscription.status) && new Date(subscription.current_period_end).getTime() > now || subscription.status === "past_due" && subscription.grace_ends_at && new Date(subscription.grace_ends_at).getTime() > now));
  }
  return <StudentActionCenter actions={actions} userId={context.user.id} canWrite={canWrite} activeLabId={labId ?? null} />;
}
