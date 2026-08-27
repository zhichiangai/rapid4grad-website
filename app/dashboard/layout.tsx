import { StudentWorkspaceNavigation } from "@/components/workspace/StudentWorkspaceNavigation";
import { requireStudentWorkspace } from "@/lib/auth/authorization";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireStudentWorkspace("/dashboard");

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <StudentWorkspaceNavigation />
      {children}
    </div>
  );
}
