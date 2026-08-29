import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
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
type CreditRow = { lab_id: string; pdf_audit_limit: number; pdf_audit_used: number; pdf_audit_reserved: number };

export default async function AdminLabsPage() {
  const { admin } = await requireAdminContext("/admin/labs");
  const { data: labsData, error: labsError } = await admin
    .from("labs")
    .select("id,owner_professor_id,name,institution,status,created_at")
    .order("created_at", { ascending: false })
    .returns<LabRow[]>();
  const labs = labsData ?? [];
  const labIds = labs.map((lab) => lab.id);
  const now = new Date().toISOString();
  const ownerIds = [...new Set(labs.map((lab) => lab.owner_professor_id))];
  const [profilesResult, membershipsResult, subscriptionsResult, creditsResult] =
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
      labIds.length
        ? admin.from("lab_usage_credits").select("lab_id,pdf_audit_limit,pdf_audit_used,pdf_audit_reserved").in("lab_id", labIds).lte("period_start", now).gt("period_end", now).returns<CreditRow[]>()
        : Promise.resolve({ data: [] as CreditRow[], error: null }),
    ]);
  const loadFailed = Boolean(
    labsError ||
      profilesResult.error ||
      membershipsResult.error ||
      subscriptionsResult.error || creditsResult.error,
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
  const latestCredits = new Map<string, CreditRow>();
  for (const credit of creditsResult.data ?? []) if (!latestCredits.has(credit.lab_id)) latestCredits.set(credit.lab_id, credit);

  return (
    <section>
      <AdminPageHeader eyebrow="Users & Access" title="Labs" description="跨 Lab 的唯讀營運摘要，僅提供教授 workspace 的安全觀察入口。" />
      {loadFailed ? <p className="mb-4 rounded-xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100">目前無法讀取 Lab 摘要，請稍後再試。</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.025]">
        <table className="w-full min-w-[1100px] text-left text-sm"><thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Lab</th><th className="px-4 py-3">Professor</th><th className="px-4 py-3">成員</th><th className="px-4 py-3">方案 / 狀態</th><th className="px-4 py-3">PDF 使用量</th><th className="px-4 py-3">Health</th><th className="px-4 py-3 text-right">觀察</th></tr></thead><tbody className="divide-y divide-white/10">
        {labs.map((lab) => {
          const owner = owners.get(lab.owner_professor_id);
          const activeMembers = memberships.filter(
            (membership) => membership.lab_id === lab.id && membership.status === "active",
          );
          const count = (role: MembershipRow["role"]) =>
            activeMembers.filter((membership) => membership.role === role).length;
          const subscription = latestSubscription.get(lab.id);
          const credit = latestCredits.get(lab.id);
          const consumed = (credit?.pdf_audit_used ?? 0) + (credit?.pdf_audit_reserved ?? 0);
          const highUsage = Boolean(credit?.pdf_audit_limit && consumed / credit.pdf_audit_limit >= 0.9);
          const paymentProblem = ["past_due", "unpaid"].includes(subscription?.status ?? "");
          const health = lab.status === "archived" || !subscription || ["canceled", "unpaid"].includes(subscription.status) && !paymentProblem ? { key: "inactive", label: "未啟用" } : paymentProblem ? { key: "critical", label: "付款異常" } : highUsage ? { key: "warning", label: "高使用" } : { key: "healthy", label: "正常" };
          return (
            <tr key={lab.id} className="hover:bg-white/[0.025]"><td className="px-4 py-4"><p className="font-semibold text-white">{lab.name}</p><p className="mt-1 text-xs text-slate-500">{lab.institution ?? "未填單位"}</p></td><td className="px-4 py-4"><p className="text-slate-200">{owner?.full_name ?? "未填姓名"}</p><p className="text-xs text-slate-500">{owner?.email ?? lab.owner_professor_id}</p></td><td className="px-4 py-4 text-slate-300">{count("student")} 學生 · {count("assistant")} 助理</td><td className="px-4 py-4"><p className="text-slate-300">{subscription?.plan_key ?? "無方案"}</p><AdminStatusBadge status={subscription?.status ?? lab.status} /></td><td className="px-4 py-4"><span className={highUsage ? "text-orange-200" : "text-slate-300"}>{consumed} / {credit?.pdf_audit_limit ?? 0}</span><p className="text-xs text-slate-500">used {credit?.pdf_audit_used ?? 0} · reserved {credit?.pdf_audit_reserved ?? 0}</p></td><td className="px-4 py-4"><AdminStatusBadge status={health.key} label={health.label} /></td><td className="px-4 py-4 text-right"><Link href={`/professor/labs/${lab.id}`} className="text-sm font-semibold text-cyan-100 hover:text-white">唯讀觀察 →</Link></td></tr>
          );
        })}
        {labs.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">目前沒有 Lab。</td></tr> : null}</tbody></table>
      </div>
    </section>
  );
}
