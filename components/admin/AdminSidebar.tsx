"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type AdminSidebarProps = { adminName: string; adminEmail: string };

const groups = [
  { label: "總覽", links: [{ href: "/admin", label: "營運總覽" }] },
  {
    label: "使用者與權限",
    links: [
      { href: "/admin/users", label: "帳號" },
      { href: "/admin/labs", label: "Labs" },
      { href: "/admin/entitlements", label: "課程權限" },
    ],
  },
  {
    label: "營運與收入",
    links: [
      { href: "/admin/subscriptions", label: "訂閱" },
      { href: "/admin/orders", label: "訂單" },
      { href: "/admin/pdf-credits", label: "PDF 使用量" },
    ],
  },
  {
    label: "內容與 QA",
    links: [
      { href: "/admin/templates", label: "AI 模板" },
      { href: "/admin/previews", label: "介面預覽" },
    ],
  },
  { label: "系統", links: [{ href: "/admin/action-logs", label: "操作紀錄" }] },
  {
    label: "進階",
    links: [
      { href: "/admin/leads", label: "Leads" },
      { href: "/admin/quotas", label: "Legacy 額度" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

export function AdminSidebar({ adminName, adminEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const navigation = (
    <nav aria-label="管理者導覽" className="space-y-5">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.links.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`block rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-cyan-300/10 font-semibold text-cyan-100 ring-1 ring-cyan-300/20" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur lg:hidden">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200">RAPID4GRAD ADMIN</p>
          <p className="mt-1 text-sm font-semibold text-white">營運控制台</p>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="admin-mobile-navigation" className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/[0.06]">
          {open ? "關閉選單" : "選單"}
        </button>
      </div>
      {open ? <><button type="button" aria-label="關閉管理者選單" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-slate-950/70 lg:hidden" /><div id="admin-mobile-navigation" className="relative z-50 border-b border-white/10 bg-slate-950 px-4 py-4 shadow-2xl lg:hidden"><p className="mb-4 text-xs text-slate-500">{adminName} · {adminEmail}</p>{navigation}</div></> : null}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-68 border-r border-white/10 bg-slate-950/95 px-4 py-7 lg:block">
        <div className="mb-8 px-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">RAPID4GRAD ADMIN</p>
          <p className="mt-2 text-lg font-semibold text-white">營運控制台</p>
          <p className="mt-2 truncate text-xs text-slate-500" title={adminEmail}>{adminName}</p>
        </div>
        {navigation}
      </aside>
    </>
  );
}
