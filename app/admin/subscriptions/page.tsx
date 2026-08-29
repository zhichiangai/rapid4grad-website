import { AdminConfirmAction } from "@/components/admin/AdminConfirmAction";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { requireAdminContext } from "@/lib/admin/authorization";
import { resolveAdminMessage } from "@/lib/admin/messages";
import { extendSubscription } from "../actions";

type SearchParams = Promise<{ message?: string; view?: string; q?: string }>;
type SubscriptionRow = {
  id: string;
  lab_id: string;
  payer_user_id: string;
  provider: string;
  plan_key: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  grace_ends_at: string | null;
  cancel_at_period_end: boolean;
};
type LabRow = { id: string; name: string };
type ProfileRow = { id: string; email: string; full_name: string | null };

export default async function AdminSubscriptionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const view = ["active", "trialing", "past_due", "canceled"].includes(params.view ?? "") ? params.view : "";
  const query = params.q?.trim().slice(0, 120) ?? "";
  const { admin } = await requireAdminContext("/admin/subscriptions");
  const { data, error } = await admin
    .from("subscriptions")
    .select("id,lab_id,payer_user_id,provider,plan_key,status,current_period_start,current_period_end,trial_ends_at,grace_ends_at,cancel_at_period_end")
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<SubscriptionRow[]>();
  let subscriptions = data ?? [];
  const [labsResult, profilesResult] = await Promise.all([
    subscriptions.length
      ? admin.from("labs").select("id,name").in("id", [...new Set(subscriptions.map((row) => row.lab_id))]).returns<LabRow[]>()
      : Promise.resolve({ data: [] as LabRow[], error: null }),
    subscriptions.length
      ? admin.from("profiles").select("id,email,full_name").in("id", [...new Set(subscriptions.map((row) => row.payer_user_id))]).returns<ProfileRow[]>()
      : Promise.resolve({ data: [] as ProfileRow[], error: null }),
  ]);
  const loadFailed = Boolean(error || labsResult.error || profilesResult.error);
  if (loadFailed) console.error("[admin-subscriptions] Safe subscription lookup failed");
  const labs = new Map((labsResult.data ?? []).map((row) => [row.id, row.name]));
  const payers = new Map((profilesResult.data ?? []).map((row) => [row.id, row]));
  if (view) subscriptions = subscriptions.filter((subscription) => view === "canceled" ? ["canceled", "unpaid"].includes(subscription.status) : subscription.status === view);
  if (query) subscriptions = subscriptions.filter((subscription) => `${labs.get(subscription.lab_id) ?? ""} ${payers.get(subscription.payer_user_id)?.full_name ?? ""} ${payers.get(subscription.payer_user_id)?.email ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const message = resolveAdminMessage(params.message);

  return (
    <section>
      <AdminPageHeader eyebrow="Operations & Revenue" title="訂閱" description="檢視 Lab 訂閱健康狀態與週期；支援延長仍維持既有最多 30 天的受控 Server Action。" />
      <form action="/admin/subscriptions" className="mb-4 flex flex-col gap-2 sm:flex-row"><input name="q" defaultValue={query} placeholder="搜尋 Lab、付款人姓名或 Email" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600" /><select name="view" defaultValue={view} className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white"><option value="">全部狀態</option><option value="active">active</option><option value="trialing">trialing</option><option value="past_due">past_due</option><option value="canceled">ending / canceled</option></select><button className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950">篩選</button></form>
      <div className="mb-4 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">目前顯示最近 100 筆訂閱的營運摘要。</div>
      {message ? <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-200">{message}</p> : null}
      {loadFailed ? <p className="mb-4 rounded-xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100">目前無法讀取訂閱資料，請稍後再試。</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.025]"><table className="w-full min-w-[980px] text-left text-sm"><thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Lab / 付款人</th><th className="px-4 py-3">方案</th><th className="px-4 py-3">狀態</th><th className="px-4 py-3">週期</th><th className="px-4 py-3">操作</th></tr></thead><tbody className="divide-y divide-white/10">
        {subscriptions.map((subscription) => {
          const payer = payers.get(subscription.payer_user_id);
          const extendable = ["active", "trialing", "past_due"].includes(subscription.status);
          return (
            <tr key={subscription.id}><td className="px-4 py-4"><p className="font-semibold text-white">{labs.get(subscription.lab_id) ?? subscription.lab_id}</p><p className="mt-1 text-xs text-slate-400">{payer?.full_name ?? "未填姓名"} · {payer?.email ?? subscription.payer_user_id}</p></td><td className="px-4 py-4 text-slate-300">{subscription.plan_key}<p className="text-xs text-slate-500">{subscription.provider}</p></td><td className="px-4 py-4"><AdminStatusBadge status={subscription.cancel_at_period_end && extendable ? "pending" : subscription.status} label={subscription.cancel_at_period_end ? `${subscription.status} · 到期取消` : subscription.status} /></td><td className="px-4 py-4 text-xs text-slate-400">{new Date(subscription.current_period_start).toLocaleDateString("zh-TW")} – {new Date(subscription.current_period_end).toLocaleDateString("zh-TW")}</td><td className="px-4 py-4">{extendable ? <details className="max-w-[240px]"><summary className="cursor-pointer text-sm font-semibold text-cyan-100">支援操作</summary><form action={extendSubscription} className="mt-3 rounded-xl border border-white/10 bg-slate-950/70 p-3">
                  <input type="hidden" name="subscriptionId" value={subscription.id} />
                  <label className="block text-xs font-medium text-slate-300">延長天數（1–30）<input type="number" name="extensionDays" min={1} max={30} required defaultValue={7} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" /></label><div className="mt-3"><AdminConfirmAction confirmationToken="CONFIRM_SUBSCRIPTION_EXTENSION" buttonLabel="延長" dialogTitle="確認延長訂閱？" dialogDescription="此操作不改方案、不復活終止訂閱，只延長目前功能期間。" reasonPlaceholder="例如：服務中斷補償 7 天" /></div></form></details> : <span className="text-xs text-slate-500">唯讀</span>}</td></tr>
          );
        })}
        {subscriptions.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">目前沒有符合條件的訂閱。</td></tr> : null}
      </tbody></table></div>
    </section>
  );
}
