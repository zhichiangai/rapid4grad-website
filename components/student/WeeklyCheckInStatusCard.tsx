export function WeeklyCheckInStatusCard({ mode, hasActiveLab, hasHistory }: { mode: "functional" | "read_only" | "none"; hasActiveLab: boolean; hasHistory: boolean }) {
  if (!hasActiveLab && !hasHistory) return <div className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-5"><p className="font-semibold text-amber-50">目前還沒有可提交進度的 Lab</p><p className="mt-2 text-sm leading-6 text-amber-100/80">加入研究室後，就可以開始每週整理研究進度。</p><a href="/dashboard/lab-join" className="mt-4 inline-flex rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950">加入 Lab</a></div>;
  if (mode === "read_only") return <div className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-5"><p className="font-semibold text-amber-50">目前研究室功能為唯讀模式</p><p className="mt-2 text-sm leading-6 text-amber-100/80">你仍然可以查看過去的每週進度，但目前無法新增或修改本週紀錄。</p></div>;
  if (mode === "none") return <div className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-5"><p className="font-semibold text-amber-50">這些是你過去在 Lab 中留下的研究進度紀錄。</p><p className="mt-2 text-sm leading-6 text-amber-100/80">你目前無法新增或修改紀錄，但歷史資料仍會保留。</p></div>;
  return null;
}
