import { AdminConfirmAction } from "@/components/admin/AdminConfirmAction";
import { requireAdminContext } from "@/lib/admin/authorization";
import { resolveAdminMessage } from "@/lib/admin/messages";
import { extendSubscription } from "../actions";

type SearchParams = Promise<{ message?: string }>;
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
  const { admin } = await requireAdminContext("/admin/subscriptions");
  const { data, error } = await admin
    .from("subscriptions")
    .select("id,lab_id,payer_user_id,provider,plan_key,status,current_period_start,current_period_end,trial_ends_at,grace_ends_at,cancel_at_period_end")
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<SubscriptionRow[]>();
  const subscriptions = data ?? [];
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
  const message = resolveAdminMessage(params.message);

  return (
    <section>
      <header className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Subscription Support</p>
        <h2 className="mt-2 text-2xl font-semibold">教授訂閱支援</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">一次最多延長 30 天，只支援仍具功能性的 active、trialing、past_due 訂閱；不會復活終止狀態。</p>
        {message ? <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-200">{message}</p> : null}
        {loadFailed ? <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100">目前無法讀取訂閱資料，請稍後再試。</p> : null}
      </header>
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {subscriptions.map((subscription) => {
          const payer = payers.get(subscription.payer_user_id);
          const extendable = ["active", "trialing", "past_due"].includes(subscription.status);
          return (
            <article key={subscription.id} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-lg font-semibold text-white">{labs.get(subscription.lab_id) ?? subscription.lab_id}</h3><p className="mt-1 text-sm text-slate-400">{subscription.plan_key} · {subscription.provider}</p></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{subscription.status}</span></div>
              <dl className="mt-4 space-y-2 text-sm text-slate-300">
                <div><dt className="inline text-slate-500">Payer：</dt><dd className="inline">{payer?.full_name ?? "未填姓名"} · {payer?.email ?? subscription.payer_user_id}</dd></div>
                <div><dt className="inline text-slate-500">Period：</dt><dd className="inline">{new Date(subscription.current_period_start).toLocaleDateString("zh-TW")} – {new Date(subscription.current_period_end).toLocaleDateString("zh-TW")}</dd></div>
                <div><dt className="inline text-slate-500">Cancel at end：</dt><dd className="inline">{subscription.cancel_at_period_end ? "是" : "否"}</dd></div>
              </dl>
              {extendable ? (
                <form action={extendSubscription} className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <input type="hidden" name="subscriptionId" value={subscription.id} />
                  <label className="block text-xs font-medium text-slate-300">支援延長天數（1–30）<input type="number" name="extensionDays" min={1} max={30} required defaultValue={7} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" /></label>
                  <div className="mt-3"><AdminConfirmAction confirmationToken="CONFIRM_SUBSCRIPTION_EXTENSION" buttonLabel="延長訂閱支援期" dialogTitle="確認延長訂閱？" dialogDescription="此操作不改方案、不復活終止訂閱，只延長目前功能期間。" reasonPlaceholder="例如：服務中斷補償 7 天" /></div>
                </form>
              ) : <p className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-400/5 p-4 text-sm text-amber-100">此狀態不可由管理介面延長或復活。</p>}
            </article>
          );
        })}
      </div>
      {!loadFailed && subscriptions.length === 0 ? <p className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center text-slate-400">目前沒有訂閱。</p> : null}
    </section>
  );
}
