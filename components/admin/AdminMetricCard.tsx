import Link from "next/link";

type AdminMetricCardProps = {
  label: string;
  value: string | number;
  detail?: string;
  href?: string;
  tone?: "default" | "warning" | "danger";
};

export function AdminMetricCard({
  label,
  value,
  detail,
  href,
  tone = "default",
}: AdminMetricCardProps) {
  const content = (
    <div
      className={`rounded-2xl border p-4 transition ${
        tone === "danger"
          ? "border-red-300/20 bg-red-400/[0.07]"
          : tone === "warning"
            ? "border-amber-300/20 bg-amber-400/[0.06]"
            : "border-white/10 bg-white/[0.035] hover:border-cyan-300/25"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
        {value}
      </p>
      {detail ? <p className="mt-1 text-xs text-slate-400">{detail}</p> : null}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
