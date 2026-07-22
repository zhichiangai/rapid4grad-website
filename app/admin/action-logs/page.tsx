import { requireAdminContext } from "@/lib/admin/authorization";
import { sanitizeAdminSnapshot } from "@/lib/admin/safe-snapshots";
import type { Json } from "@/types/database-v2.generated";

type LogRow = { id: string; admin_user_id: string; action_type: string; target_type: string; target_id: string | null; reason: string; before_state: Json | null; after_state: Json | null; request_id: string; created_at: string };
type ProfileRow = { id: string; email: string; full_name: string | null };

export default async function AdminActionLogsPage() {
  const { admin } = await requireAdminContext("/admin/action-logs");
  const { data, error } = await admin.from("admin_action_logs").select("id,admin_user_id,action_type,target_type,target_id,reason,before_state,after_state,request_id,created_at").order("created_at", { ascending: false }).limit(200).returns<LogRow[]>();
  const logs = data ?? [];
  const { data: profilesData, error: profilesError } = logs.length ? await admin.from("profiles").select("id,email,full_name").in("id", [...new Set(logs.map((log) => log.admin_user_id))]).returns<ProfileRow[]>() : { data: [] as ProfileRow[], error: null };
  const loadFailed = Boolean(error || profilesError);
  if (loadFailed) console.error("[admin-action-logs] Audit log lookup failed");
  const profiles = new Map((profilesData ?? []).map((profile) => [profile.id, profile]));
  return (
    <section>
      <header className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Immutable Audit Trail</p><h2 className="mt-2 text-2xl font-semibold">管理操作紀錄</h2><p className="mt-2 text-sm leading-6 text-slate-400">顯示最近 200 筆安全快照。畫面再次套用 allowlist，不會呈現 raw payload、PDF、prompt、token 或密鑰。</p>{loadFailed ? <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100">目前無法讀取操作紀錄，請稍後再試。</p> : null}</header>
      <div className="mt-5 space-y-4">{logs.map((log) => { const actor = profiles.get(log.admin_user_id); const before = sanitizeAdminSnapshot(log.before_state); const after = sanitizeAdminSnapshot(log.after_state); return <article key={log.id} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-white">{log.action_type}</h3><p className="mt-1 text-sm text-slate-400">{log.target_type} · {log.target_id ?? "無 target ID"}</p></div><time className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString("zh-TW")}</time></div><p className="mt-3 text-sm text-slate-200"><span className="text-slate-500">原因：</span>{log.reason}</p><p className="mt-1 text-xs text-slate-500">執行者：{actor?.full_name ?? "Admin"} · {actor?.email ?? log.admin_user_id}</p><div className="mt-4 grid gap-3 lg:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"><p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Before</p><pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-300">{before ? JSON.stringify(before, null, 2) : "-"}</pre></div><div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"><p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">After</p><pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-300">{after ? JSON.stringify(after, null, 2) : "-"}</pre></div></div><p className="mt-3 font-mono text-[11px] text-slate-600">request: {log.request_id}</p></article>; })}</div>
      {!loadFailed && logs.length === 0 ? <p className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center text-slate-400">目前沒有管理操作紀錄。</p> : null}
    </section>
  );
}
