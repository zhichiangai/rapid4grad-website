type AdminStatusBadgeProps = {
  status: string | null | undefined;
  label?: string;
};

const statusStyles: Record<string, string> = {
  healthy: "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",
  warning: "border-amber-300/25 bg-amber-400/10 text-amber-200",
  critical: "border-red-300/25 bg-red-400/10 text-red-200",
  inactive: "border-slate-400/20 bg-slate-400/10 text-slate-300",
  active: "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",
  paid: "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",
  trialing: "border-sky-300/25 bg-sky-400/10 text-sky-200",
  pending: "border-amber-300/25 bg-amber-400/10 text-amber-200",
  past_due: "border-orange-300/25 bg-orange-400/10 text-orange-200",
  unpaid: "border-red-300/25 bg-red-400/10 text-red-200",
  failed: "border-red-300/25 bg-red-400/10 text-red-200",
  suspended: "border-red-300/25 bg-red-400/10 text-red-200",
  canceled: "border-slate-400/20 bg-slate-400/10 text-slate-300",
  archived: "border-slate-400/20 bg-slate-400/10 text-slate-300",
  revoked: "border-slate-400/20 bg-slate-400/10 text-slate-300",
};

export function AdminStatusBadge({ status, label }: AdminStatusBadgeProps) {
  const normalized = status?.toLowerCase() ?? "unknown";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[normalized] ?? "border-white/10 bg-white/[0.05] text-slate-300"}`}
    >
      {label ?? status ?? "unknown"}
    </span>
  );
}
