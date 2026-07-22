import { AdminConfirmAction } from "@/components/admin/AdminConfirmAction";
import { requireAdminContext } from "@/lib/admin/authorization";
import { resolveAdminMessage } from "@/lib/admin/messages";
import { compensatePdfCredits } from "../actions";

type SearchParams = Promise<{ message?: string }>;
type CreditRow = { id: string; lab_id: string; subscription_id: string; period_start: string; period_end: string; pdf_audit_limit: number; pdf_audit_reserved: number; pdf_audit_used: number };
type LabRow = { id: string; name: string };
type SubscriptionRow = { id: string; plan_key: string; status: string; current_period_end: string; grace_ends_at: string | null };

export default async function AdminPdfCreditsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { admin } = await requireAdminContext("/admin/pdf-credits");
  const now = new Date().toISOString();
  const { data, error } = await admin.from("lab_usage_credits").select("id,lab_id,subscription_id,period_start,period_end,pdf_audit_limit,pdf_audit_reserved,pdf_audit_used").lte("period_start", now).gt("period_end", now).order("period_end").returns<CreditRow[]>();
  const credits = data ?? [];
  const [labsResult, subscriptionsResult] = await Promise.all([
    credits.length ? admin.from("labs").select("id,name").in("id", [...new Set(credits.map((row) => row.lab_id))]).returns<LabRow[]>() : Promise.resolve({ data: [] as LabRow[], error: null }),
    credits.length ? admin.from("subscriptions").select("id,plan_key,status,current_period_end,grace_ends_at").in("id", [...new Set(credits.map((row) => row.subscription_id))]).returns<SubscriptionRow[]>() : Promise.resolve({ data: [] as SubscriptionRow[], error: null }),
  ]);
  const loadFailed = Boolean(error || labsResult.error || subscriptionsResult.error);
  if (loadFailed) console.error("[admin-pdf-credits] Safe credit lookup failed");
  const labs = new Map((labsResult.data ?? []).map((row) => [row.id, row.name]));
  const subscriptions = new Map((subscriptionsResult.data ?? []).map((row) => [row.id, row]));
  const message = resolveAdminMessage(params.message);
  return (
    <section>
      <header className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">PDF Shared Pool</p><h2 className="mt-2 text-2xl font-semibold">當期 PDF 額度補償</h2><p className="mt-2 text-sm leading-6 text-slate-400">一次補償 1–100 點，只增加當期 limit，不修改 used 或 reserved，也不處理終止訂閱。</p>{message ? <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-200">{message}</p> : null}{loadFailed ? <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100">目前無法讀取共享額度，請稍後再試。</p> : null}</header>
      <div className="mt-5 grid gap-4 xl:grid-cols-2">{credits.map((credit) => { const subscription = subscriptions.get(credit.subscription_id); const remaining = Math.max(credit.pdf_audit_limit - credit.pdf_audit_reserved - credit.pdf_audit_used, 0); return <article key={credit.id} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-lg font-semibold text-white">{labs.get(credit.lab_id) ?? credit.lab_id}</h3><p className="mt-1 text-sm text-slate-400">{subscription?.plan_key ?? "未知方案"} · {subscription?.status ?? "未知狀態"}</p></div><span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">剩餘 {remaining}</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-slate-950/60 p-3"><strong className="block text-white">{credit.pdf_audit_limit}</strong><span className="text-xs text-slate-500">Limit</span></div><div className="rounded-2xl bg-slate-950/60 p-3"><strong className="block text-white">{credit.pdf_audit_reserved}</strong><span className="text-xs text-slate-500">Reserved</span></div><div className="rounded-2xl bg-slate-950/60 p-3"><strong className="block text-white">{credit.pdf_audit_used}</strong><span className="text-xs text-slate-500">Used</span></div></div><p className="mt-3 text-xs text-slate-500">當期：{new Date(credit.period_start).toLocaleDateString("zh-TW")} – {new Date(credit.period_end).toLocaleDateString("zh-TW")}</p><form action={compensatePdfCredits} className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4"><input type="hidden" name="creditId" value={credit.id} /><label className="block text-xs font-medium text-slate-300">補償點數（1–100）<input type="number" name="creditAmount" min={1} max={100} required defaultValue={1} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" /></label><div className="mt-3"><AdminConfirmAction confirmationToken="CONFIRM_CREDIT_COMPENSATION" buttonLabel="補償當期額度" dialogTitle="確認補償 PDF 額度？" dialogDescription="只會增加目前週期的 limit；已使用與已保留數不會改變。" reasonPlaceholder="例如：稽核服務失敗補償 1 點" /></div></form></article>; })}</div>
      {!loadFailed && credits.length === 0 ? <p className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center text-slate-400">目前沒有有效週期的 PDF shared pool。</p> : null}
    </section>
  );
}
