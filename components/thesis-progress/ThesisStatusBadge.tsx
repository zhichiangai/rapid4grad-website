import type { ThesisMilestoneStatus } from "@/lib/thesis-progress/thesis-domain";
import { statusLabel } from "@/lib/thesis-progress/thesis-domain";

const styles: Record<ThesisMilestoneStatus, string> = {
  not_started: "border-white/10 bg-white/[0.04] text-slate-300",
  in_progress: "border-blue-300/25 bg-blue-400/10 text-blue-100",
  blocked: "border-red-300/25 bg-red-400/10 text-red-100",
  completed: "border-emerald-300/25 bg-emerald-400/10 text-emerald-100",
};

export function ThesisStatusBadge({ status }: { status: ThesisMilestoneStatus }) {
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}>{statusLabel(status)}</span>;
}
