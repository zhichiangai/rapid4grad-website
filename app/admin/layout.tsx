import Link from "next/link";
import { requireAdminContext } from "@/lib/admin/authorization";

const adminLinks = [
  { href: "/admin", label: "總覽" },
  { href: "/admin/users", label: "帳號" },
  { href: "/admin/entitlements", label: "課程權限" },
  { href: "/admin/labs", label: "Labs" },
  { href: "/admin/subscriptions", label: "訂閱" },
  { href: "/admin/orders", label: "訂單" },
  { href: "/admin/pdf-credits", label: "PDF 額度" },
  { href: "/admin/action-logs", label: "操作紀錄" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/quotas", label: "Legacy 額度" },
  { href: "/admin/templates", label: "Prompt CMS" },
];

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { profile } = await requireAdminContext("/admin");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.18),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6 flex flex-col justify-between gap-4 rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-blue-950/20 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">
              RAPID4GRAD ADMIN
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              管理者後台
            </h1>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <p className="text-xs text-slate-500">
              {profile.fullName ?? profile.email}
            </p>
            <nav className="flex flex-wrap gap-2 sm:justify-end">
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200 transition hover:border-blue-300/30 hover:bg-blue-500/10"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
