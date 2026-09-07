import type { RapidEnvironment } from "@/lib/runtime/environment";

const labels: Record<RapidEnvironment, string> = {
  local: "本機環境",
  staging: "測試環境",
  production: "正式環境",
};

export function AdminEnvironmentBadge({ environment }: { environment: RapidEnvironment }) {
  const staging = environment === "staging";
  return (
    <span
      title={`RAPID_ENV=${environment}`}
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${staging ? "border-amber-300/40 bg-amber-300/10 text-amber-100" : environment === "production" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-slate-300/25 bg-slate-300/10 text-slate-200"}`}
    >
      {labels[environment]}
    </span>
  );
}

