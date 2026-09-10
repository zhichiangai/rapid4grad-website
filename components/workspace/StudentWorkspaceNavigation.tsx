"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export const studentWorkspaceGroups = [
  { label: "核心", links: [
    { href: "/dashboard", label: "總覽" },
    { href: "/dashboard/weekly-check-in", label: "每週進度" },
    { href: "/dashboard/meetings", label: "研究 Meeting" },
    { href: "/dashboard/actions", label: "我的下一步" },
    { href: "/dashboard/thesis", label: "論文進度" },
    { href: "/dashboard/graduation-risk", label: "畢業風險" },
  ] },
  { label: "研究工具", links: [
    { href: "/dashboard/ai-command", label: "AI 指令" },
    { href: "/dashboard/ai-audit", label: "PDF AI 稽核" },
    { href: "/dashboard/ai-audit/history", label: "稽核歷史" },
  ] },
  { label: "其他", links: [
    { href: "/dashboard/lab-join", label: "加入 Lab" },
    { href: "/learn", label: "課程學習" },
    { href: "/dashboard/advisor-profile", label: "教授偏好" },
    { href: "/course", label: "課程方案" },
    { href: "/account/security", label: "帳號與安全" },
  ] },
] as const;

export type StudentNavigationCapabilities = {
  lab: {
    hasActiveLab: boolean;
    canUsePdfAudit: boolean;
    labName: string | null;
  };
  course: {
    canOpenLearningCenter: boolean;
  };
};

export const studentWorkspaceLinks = ([] as Array<{ href: string; label: string }>).concat(
  ...studentWorkspaceGroups.map((group) => group.links as readonly { href: string; label: string }[]),
);
// Preview buttons preserve the same controlled navigation contract: onClick={() => onPreviewNavigate?.(link.href)}
// Active preview state remains aria-current={activeHref === link.href ? "page" : undefined}.
export type StudentWorkspaceHref = string;

type StudentWorkspaceNavigationProps = {
  previewMode?: boolean;
  activeHref?: StudentWorkspaceHref;
  onPreviewNavigate?: (href: StudentWorkspaceHref) => void;
  capabilities?: StudentNavigationCapabilities;
};

export function StudentWorkspaceNavigation({ previewMode = false, activeHref, onPreviewNavigate, capabilities }: StudentWorkspaceNavigationProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);
  const navigate = (href: StudentWorkspaceHref) => {
    onPreviewNavigate?.(href);
    setMenuOpen(false);
  };
  const linkClass = (active: boolean) => `block rounded-xl px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 ${active ? "bg-cyan-400/15 text-cyan-50" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"}`;
  const renderLink = (href: StudentWorkspaceHref, label: string) => {
    const active = activeHref === href || (!activeHref && href === "/dashboard");
    const className = linkClass(active);
    return previewMode ? (
      <button type="button" key={href} onClick={() => onPreviewNavigate?.(href)} aria-current={active ? "page" : undefined} className={`${className} w-full text-left`}>{label}</button>
    ) : (
      <Link key={href} href={href} onClick={() => setMenuOpen(false)} aria-current={active ? "page" : undefined} className={className}>{label}</Link>
    );
  };
  const groups = studentWorkspaceGroups.map((group) => ({
    ...group,
    links: group.links.filter((link) => (
      (link.href !== "/dashboard/ai-audit" && link.href !== "/dashboard/ai-audit/history" || capabilities?.lab.canUsePdfAudit === true)
      && (link.href !== "/learn" || capabilities?.course.canOpenLearningCenter !== false)
      && (link.href !== "/dashboard/lab-join" || capabilities?.lab.hasActiveLab !== true)
    )),
  })).filter((group) => group.links.length > 0);

  return (
    <header className="border-b border-white/10 bg-slate-950/95 px-4 py-4 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        {previewMode ? <button type="button" onClick={() => navigate("/dashboard")} className="font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">RAPID4GRAD</button> : <Link href="/dashboard" className="font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">RAPID4GRAD</Link>}
        <button type="button" aria-expanded={menuOpen} aria-controls="student-workspace-menu" onClick={() => setMenuOpen((open) => !open)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 hover:border-cyan-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 md:hidden">{menuOpen ? "關閉選單" : "選單"}</button>
        <nav id="student-workspace-menu" aria-label="學生工作台導覽" className={`${menuOpen ? "absolute inset-x-4 top-[4.5rem] z-20 block" : "hidden"} rounded-2xl border border-white/10 bg-slate-950 p-3 shadow-2xl shadow-black/30 md:static md:block md:border-0 md:bg-transparent md:p-0 md:shadow-none`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            {groups.map((group) => <div key={group.label} className="flex flex-col gap-1 md:gap-0"><p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 md:mb-1">{group.label}</p><div className="flex flex-col gap-1 md:flex-row">{group.links.map((link) => renderLink(link.href, link.label))}</div></div>)}
          </div>
        </nav>
      </div>
    </header>
  );
}
