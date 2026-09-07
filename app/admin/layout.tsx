import { requireAdminContext } from "@/lib/admin/authorization";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminEnvironmentBadge } from "@/components/admin/AdminEnvironmentBadge";
import { assertEnvironmentSafety, getRuntimeEnvironment } from "@/lib/runtime/environment";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  assertEnvironmentSafety();
  const { profile } = await requireAdminContext("/admin");
  const environment = getRuntimeEnvironment();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.18),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <AdminSidebar adminName={profile.fullName ?? profile.email} adminEmail={profile.email} />
      <main className="min-w-0 lg:pl-68">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          <div className="mb-4 flex justify-end"><AdminEnvironmentBadge environment={environment} /></div>
          {children}
        </div>
      </main>
    </div>
  );
}
