import Link from "next/link";

const studentWorkspaceLinks = [
  { href: "/dashboard", label: "研究工作台" },
  { href: "/dashboard/ai-command", label: "AI 指令產生器" },
  { href: "/dashboard/ai-audit", label: "PDF AI 稽核" },
  { href: "/dashboard/ai-audit/history", label: "稽核歷史" },
  { href: "/dashboard/lab-join", label: "加入 Lab" },
  { href: "/dashboard/course", label: "課程觀看" },
  { href: "/course", label: "課程方案" },
];

type StudentWorkspaceNavigationProps = {
  previewMode?: boolean;
};

export function StudentWorkspaceNavigation({
  previewMode = false,
}: StudentWorkspaceNavigationProps) {
  return (
    <header className="border-b border-white/10 bg-slate-950/90 px-4 py-4 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {previewMode ? (
          <span className="font-semibold tracking-tight">RAPID4GRAD</span>
        ) : (
          <Link href="/dashboard" className="font-semibold tracking-tight">
            RAPID4GRAD
          </Link>
        )}
        <nav className="flex flex-wrap gap-2" aria-label="學生工作台導覽">
          {studentWorkspaceLinks.map((link) =>
            previewMode ? (
              <span
                key={link.href}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-400"
              >
                {link.label}
              </span>
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
