export function WeeklyCheckInStatusCard({ mode, hasActiveLab, hasHistory }: { mode: "functional" | "read_only" | "none"; hasActiveLab: boolean; hasHistory: boolean }) {
  if (!hasActiveLab && !hasHistory) return <div className="rounded-2xl border border-cyan-300/25 bg-cyan-400/10 p-5"><p className="font-semibold text-cyan-50">你的 Personal Weekly 已開放</p><p className="mt-2 text-sm leading-6 text-cyan-100/80">不需要加入研究室，也可以記錄自己的每週研究進度。之後加入可用的 Lab，再選擇是否分享。</p></div>;
  if (mode === "read_only") return <div className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-5"><p className="font-semibold text-amber-50">Lab 協作目前為唯讀模式</p><p className="mt-2 text-sm leading-6 text-amber-100/80">你的 Personal Weekly 仍然可以新增或修改；既有 Lab 紀錄會依原本權限保留。</p></div>;
  if (mode === "none") return <div className="rounded-2xl border border-cyan-300/25 bg-cyan-400/10 p-5"><p className="font-semibold text-cyan-50">Personal Weekly 仍然可用</p><p className="mt-2 text-sm leading-6 text-cyan-100/80">目前沒有 active Lab，新的紀錄會預設保持私人。</p></div>;
  return null;
}
