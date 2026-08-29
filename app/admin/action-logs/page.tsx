import { requireAdminContext } from "@/lib/admin/authorization";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { sanitizeAdminSnapshot } from "@/lib/admin/safe-snapshots";
import type { Json } from "@/types/database-v2.generated";

type SearchParams = Promise<{ action?: string; target?: string; actor?: string }>;
type LogRow = { id: string; admin_user_id: string; action_type: string; target_type: string; target_id: string | null; reason: string; before_state: Json | null; after_state: Json | null; request_id: string; created_at: string };
type ProfileRow = { id: string; email: string; full_name: string | null };

export default async function AdminActionLogsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const actionFilter = params.action?.trim().slice(0, 80) ?? "";
  const targetFilter = params.target?.trim().slice(0, 80) ?? "";
  const actorFilter = params.actor?.trim().slice(0, 120) ?? "";
  const { admin } = await requireAdminContext("/admin/action-logs");
  const { data, error } = await admin.from("admin_action_logs").select("id,admin_user_id,action_type,target_type,target_id,reason,before_state,after_state,request_id,created_at").order("created_at", { ascending: false }).limit(200).returns<LogRow[]>();
  const logs = data ?? [];
  const { data: profilesData, error: profilesError } = logs.length ? await admin.from("profiles").select("id,email,full_name").in("id", [...new Set(logs.map((log) => log.admin_user_id))]).returns<ProfileRow[]>() : { data: [] as ProfileRow[], error: null };
  const loadFailed = Boolean(error || profilesError);
  if (loadFailed) console.error("[admin-action-logs] Audit log lookup failed");
  const profiles = new Map((profilesData ?? []).map((profile) => [profile.id, profile]));
  const filteredLogs = logs.filter((log) => {
    const actor = profiles.get(log.admin_user_id);
    const actorValue = `${actor?.full_name ?? ""} ${actor?.email ?? ""}`.toLowerCase();
    return (!actionFilter || log.action_type === actionFilter) && (!targetFilter || log.target_type === targetFilter) && (!actorFilter || actorValue.includes(actorFilter.toLowerCase()));
  });
  const actionOptions = [...new Set(logs.map((log) => log.action_type))].sort();
  const targetOptions = [...new Set(logs.map((log) => log.target_type))].sort();
  return (
    <section>
      <AdminPageHeader eyebrow="System" title="操作紀錄" description="顯示最近 200 筆安全快照；before / after 內容會套用 allowlist，不呈現 raw payload、PDF、prompt、token 或密鑰。" />
      {loadFailed ? <p className="mb-4 rounded-xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100">目前無法讀取操作紀錄，請稍後再試。</p> : null}
      <form method="get" className="mb-4 grid gap-2 sm:grid-cols-3"><select name="action" defaultValue={actionFilter} className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white"><option value="">全部操作</option>{actionOptions.map((action) => <option key={action} value={action}>{action}</option>)}</select><select name="target" defaultValue={targetFilter} className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white"><option value="">全部目標</option>{targetOptions.map((target) => <option key={target} value={target}>{target}</option>)}</select><div className="flex gap-2"><input name="actor" defaultValue={actorFilter} placeholder="搜尋執行者" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600" /><button className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950">篩選</button></div></form>
      <div className="mb-4 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">最近 200 筆中符合條件：{filteredLogs.length} 筆。</div>
      <div className="space-y-2">{filteredLogs.map((log) => { const actor = profiles.get(log.admin_user_id); const before = sanitizeAdminSnapshot(log.before_state); const after = sanitizeAdminSnapshot(log.after_state); return <details key={log.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-4"><summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3"><span><AdminStatusBadge status="active" label={log.action_type} /><span className="ml-3 text-sm text-slate-400">{log.target_type} · {log.target_id ?? "無 target ID"}</span></span><time className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString("zh-TW")}</time></summary><p className="mt-4 text-sm text-slate-200"><span className="text-slate-500">原因：</span>{log.reason}</p><p className="mt-1 text-xs text-slate-500">執行者：{actor?.full_name ?? "Admin"} · {actor?.email ?? log.admin_user_id}</p><div className="mt-4 grid gap-3 lg:grid-cols-2"><div className="rounded-xl bg-slate-950/70 p-3"><p className="mb-2 text-xs text-slate-500">Before</p><pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-300">{before ? JSON.stringify(before, null, 2) : "-"}</pre></div><div className="rounded-xl bg-slate-950/70 p-3"><p className="mb-2 text-xs text-slate-500">After</p><pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-300">{after ? JSON.stringify(after, null, 2) : "-"}</pre></div></div></details>; })}</div>
      {!loadFailed && filteredLogs.length === 0 ? <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center text-slate-400">目前沒有符合條件的管理操作紀錄。</p> : null}
    </section>
  );
}
