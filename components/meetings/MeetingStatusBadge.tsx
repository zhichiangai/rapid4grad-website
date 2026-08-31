import type { MeetingStatus } from "@/lib/meetings/meeting-domain";

export function MeetingStatusBadge({ status, pending = false }: { status: MeetingStatus; pending?: boolean }) {
  const copy = pending
    ? { label: "待補紀錄", className: "border-amber-300/30 bg-amber-400/10 text-amber-100" }
    : status === "scheduled"
      ? { label: "已排程", className: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100" }
      : status === "completed"
        ? { label: "已完成", className: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100" }
        : { label: "已取消", className: "border-white/10 bg-white/[0.04] text-slate-400" };
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${copy.className}`}>{copy.label}</span>;
}
