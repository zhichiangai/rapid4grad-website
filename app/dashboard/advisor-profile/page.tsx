import { AdvisorMemorySettings } from "@/components/workspace/AdvisorMemorySettings";
import { requireStudentWorkspace } from "@/lib/auth/authorization";

export default async function AdvisorProfilePage() {
  const context = await requireStudentWorkspace("/dashboard/advisor-profile");
  if (context.profile.role !== "student") return null;
  return <AdvisorMemorySettings />;
}
