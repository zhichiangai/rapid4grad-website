import Link from "next/link";
import { requireAdminContext } from "@/lib/admin/authorization";

type LabRow = {
  id: string;
  owner_professor_id: string;
  name: string;
  institution: string | null;
  status: "active" | "archived";
  created_at: string;
};
type ProfileRow = { id: string; email: string; full_name: string | null };
type MembershipRow = {
  lab_id: string;
  role: "professor" | "assistant" | "student";
  status: "active" | "pending" | "removed";
};
type SubscriptionRow = {
  lab_id: string;
  plan_key: string;
  status: string;
  current_period_end: string;
};

export default async function AdminLabsPage() {
  const { admin } = await requireAdminContext("/admin/labs");
  const { data: labsData, error: labsError } = await admin
    .from("labs")
    .select("id,owner_professor_id,name,institution,status,created_at")
    .order("created_at", { ascending: false })
    .returns<LabRow[]>();
  const labs = labsData ?? [];
  const labIds = labs.map((lab) => lab.id);
  const ownerIds = [...new Set(labs.map((lab) => lab.owner_professor_id))];
  const [profilesResult, membershipsResult, subscriptionsResult] =
    await Promise.all([
      ownerIds.length
        ? admin
            .from("profiles")
            .select("id,email,full_name")
            .in("id", ownerIds)
            .returns<ProfileRow[]>()
        : Promise.resolve({ data: [] as ProfileRow[], error: null }),
      labIds.length
        ? admin
            .from("lab_memberships")
            .select("lab_id,role,status")
            .in("lab_id", labIds)
            .returns<MembershipRow[]>()
        : Promise.resolve({ data: [] as MembershipRow[], error: null }),
      labIds.length
        ? admin
            .from("subscriptions")
            .select("lab_id,plan_key,status,current_period_end")
            .in("lab_id", labIds)
            .order("current_period_end", { ascending: false })
            .returns<SubscriptionRow[]>()
        : Promise.resolve({ data: [] as SubscriptionRow[], error: null }),
    ]);
  const loadFailed = Boolean(
    labsError ||
      profilesResult.error ||
      membershipsResult.error ||
      subscriptionsResult.error,
  );
  if (loadFailed) console.error("[admin-labs] Safe lab summary lookup failed");

  const owners = new Map((profilesResult.data ?? []).map((row) => [row.id, row]));
  const memberships = membershipsResult.data ?? [];
  const latestSubscription = new Map<string, SubscriptionRow>();
  for (const subscription of subscriptionsResult.data ?? []) {
    if (!latestSubscription.has(subscription.lab_id)) {
      latestSubscription.set(subscription.lab_id, subscription);
    }
  }

  return (
    <section>
      <header className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Lab Observation</p>
        <h2 className="mt-2 text-2xl font-semibold">實驗室唯讀觀察</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Admin 可跨 Lab 查看安全摘要，但不能在 Professor Workspace 執行成員或邀請碼操作。
        </p>
        {loadFailed ? <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100">目前無法讀取 Lab 摘要，請稍後再試。</p> : null}
      </header>
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {labs.map((lab) => {
          const owner = owners.get(lab.owner_professor_id);
          const activeMembers = memberships.filter(
            (membership) => membership.lab_id === lab.id && membership.status === "active",
          );
          const count = (role: MembershipRow["role"]) =>
            activeMembers.filter((membership) => membership.role === role).length;
          const subscription = latestSubscription.get(lab.id);
          return (
            <article key={lab.id} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{lab.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">{lab.institution ?? "未填單位"}</p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{lab.status}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-2xl bg-slate-950/60 p-3"><strong className="block text-white">{count("student")}</strong><span className="text-xs text-slate-500">學生</span></div>
                <div className="rounded-2xl bg-slate-950/60 p-3"><strong className="block text-white">{count("assistant")}</strong><span className="text-xs text-slate-500">助理</span></div>
                <div className="rounded-2xl bg-slate-950/60 p-3"><strong className="block text-white">{count("professor")}</strong><span className="text-xs text-slate-500">教授</span></div>
              </div>
              <dl className="mt-4 space-y-2 text-sm text-slate-300">
                <div><dt className="inline text-slate-500">Owner：</dt><dd className="inline">{owner?.full_name ?? "未填姓名"} · {owner?.email ?? lab.owner_professor_id}</dd></div>
                <div><dt className="inline text-slate-500">Subscription：</dt><dd className="inline">{subscription ? `${subscription.plan_key} / ${subscription.status}` : "無"}</dd></div>
                {subscription ? <div><dt className="inline text-slate-500">Period end：</dt><dd className="inline">{new Date(subscription.current_period_end).toLocaleString("zh-TW")}</dd></div> : null}
              </dl>
              <Link href={`/professor/labs/${lab.id}`} className="mt-5 inline-flex rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/15">
                進入唯讀觀察
              </Link>
            </article>
          );
        })}
      </div>
      {!loadFailed && labs.length === 0 ? <p className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center text-slate-400">目前沒有 Lab。</p> : null}
    </section>
  );
}
