import { StudentWorkspaceNavigation } from "@/components/workspace/StudentWorkspaceNavigation";
import { requireStudentWorkspace } from "@/lib/auth/authorization";
import { resolveStudentCapabilities } from "@/lib/student/capabilities";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = await requireStudentWorkspace("/dashboard");
  const capabilities = await resolveStudentCapabilities(context.supabase, context.user.id);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <StudentWorkspaceNavigation capabilities={capabilities} />
      {children}
    </div>
  );
}
