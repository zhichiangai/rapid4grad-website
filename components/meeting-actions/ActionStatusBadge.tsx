import type { ActionStatus } from "@/lib/meeting-actions/action-domain";
import { actionStatusLabel } from "@/lib/meeting-actions/action-domain";

const styles: Record<ActionStatus, string> = {
  todo: "border-cyan-300/20 bg-cyan-400/10 text-cyan-100",
  doing: "border-blue-300/20 bg-blue-400/10 text-blue-100",
  done: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
  canceled: "border-white/10 bg-white/[0.04] text-slate-400",
};

export function ActionStatusBadge({ status }: { status: ActionStatus }) {
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}>{actionStatusLabel(status)}</span>;
}
