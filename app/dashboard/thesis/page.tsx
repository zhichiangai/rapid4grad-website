import { redirect } from "next/navigation";
import { ThesisProgressTracker } from "@/components/thesis-progress/ThesisProgressTracker";
import { requireStudentWorkspace } from "@/lib/auth/authorization";
import { loadStudentThesisProgress } from "@/lib/thesis-progress/thesis-data";

export default async function ThesisProgressPage() {
  const context = await requireStudentWorkspace("/dashboard/thesis");
  if (context.profile.role !== "student") redirect("/dashboard");
  const milestones = await loadStudentThesisProgress(context.supabase, context.user.id);
  return <ThesisProgressTracker milestones={milestones} />;
}
