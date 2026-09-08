import { StudentWorkspaceNavigation } from "@/components/workspace/StudentWorkspaceNavigation";
import { StudentWorkspaceCapabilitiesProvider } from "@/components/workspace/StudentWorkspaceCapabilitiesContext";
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
    <StudentWorkspaceCapabilitiesProvider value={{ hasActiveLab: capabilities.lab.hasActiveLab, canUsePdfAudit: capabilities.lab.canUsePdfAudit }}>
      <div className="min-h-screen bg-slate-950 text-white">
        <StudentWorkspaceNavigation capabilities={capabilities} />
        {children}
      </div>
    </StudentWorkspaceCapabilitiesProvider>
  );
}
