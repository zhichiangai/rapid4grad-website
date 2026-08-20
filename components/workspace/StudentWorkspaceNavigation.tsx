import Link from "next/link";

export const studentWorkspaceLinks = [
  { href: "/dashboard", label: "研究工作台" },
  { href: "/dashboard/ai-command", label: "AI 指令產生器" },
  { href: "/dashboard/ai-audit", label: "PDF AI 稽核" },
  { href: "/dashboard/ai-audit/history", label: "稽核歷史" },
  { href: "/dashboard/lab-join", label: "加入 Lab" },
  { href: "/dashboard/course", label: "課程觀看" },
  { href: "/course", label: "課程方案" },
] as const;

export type StudentWorkspaceHref = (typeof studentWorkspaceLinks)[number]["href"];

type StudentWorkspaceNavigationProps = {
  previewMode?: boolean;
  activeHref?: StudentWorkspaceHref;
  onPreviewNavigate?: (href: StudentWorkspaceHref) => void;
};

export function StudentWorkspaceNavigation({
  previewMode = false,
  activeHref,
  onPreviewNavigate,
}: StudentWorkspaceNavigationProps) {
  return (
    <header className="border-b border-white/10 bg-slate-950/90 px-4 py-4 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {previewMode ? (
          <button
            type="button"
            onClick={() => onPreviewNavigate?.("/dashboard")}
            className="text-left font-semibold tracking-tight transition hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
          >
            RAPID4GRAD
          </button>
        ) : (
          <Link href="/dashboard" className="font-semibold tracking-tight">
            RAPID4GRAD
          </Link>
        )}
        <nav className="flex flex-wrap gap-2" aria-label="學生工作台導覽">
          {studentWorkspaceLinks.map((link) =>
            previewMode ? (
              <button
                type="button"
                key={link.href}
                onClick={() => onPreviewNavigate?.(link.href)}
                aria-current={activeHref === link.href ? "page" : undefined}
                className={`rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 ${
                  activeHref === link.href
                    ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-50 shadow-lg shadow-cyan-950/30"
                    : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-blue-300/30 hover:bg-blue-500/10 hover:text-white"
                }`}
              >
                {link.label}
              </button>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200 transition hover:border-blue-300/30 hover:bg-blue-500/10"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </header>
  );
}
