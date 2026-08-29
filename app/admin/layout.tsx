import { requireAdminContext } from "@/lib/admin/authorization";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { profile } = await requireAdminContext("/admin");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.18),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <AdminSidebar adminName={profile.fullName ?? profile.email} adminEmail={profile.email} />
      <main className="min-w-0 lg:pl-68">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">{children}</div>
      </main>
    </div>
  );
}
