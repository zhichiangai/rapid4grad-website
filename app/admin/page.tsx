import Link from "next/link";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { requireAdminContext } from "@/lib/admin/authorization";
import { sanitizeAdminSnapshot } from "@/lib/admin/safe-snapshots";
import type { Json } from "@/types/database-v2.generated";

type CreditRow = { pdf_audit_limit: number; pdf_audit_used: number; pdf_audit_reserved: number };
type SubscriptionRow = { status: string };
type ActionRow = { id: string; admin_user_id: string; action_type: string; target_type: string; target_id: string | null; reason: string; after_state: Json | null; created_at: string };
type ProfileRow = { id: string; email: string; full_name: string | null };

export default async function AdminHomePage() {
  const { admin } = await requireAdminContext("/admin");
  const now = new Date().toISOString();
  const [users, labs, subscriptions, credits, actions, pastDue, suspended] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("labs").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("subscriptions").select("status").in("status", ["trialing", "active", "past_due"]).returns<SubscriptionRow[]>(),
    admin.from("lab_usage_credits").select("pdf_audit_limit,pdf_audit_used,pdf_audit_reserved").lte("period_start", now).gt("period_end", now).returns<CreditRow[]>(),
    admin.from("admin_action_logs").select("id,admin_user_id,action_type,target_type,target_id,reason,after_state,created_at").order("created_at", { ascending: false }).limit(5).returns<ActionRow[]>(),
    admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "past_due"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("account_status", "suspended"),
  ]);
  const actionRows = actions.data ?? [];
  const { data: actionProfiles } = actionRows.length ? await admin.from("profiles").select("id,email,full_name").in("id", [...new Set(actionRows.map((action) => action.admin_user_id))]).returns<ProfileRow[]>() : { data: [] as ProfileRow[] };
  const actionActors = new Map((actionProfiles ?? []).map((profile) => [profile.id, profile]));
  const creditTotals = (credits.data ?? []).reduce((total, row) => ({
    limit: total.limit + Math.max(row.pdf_audit_limit, 0),
    used: total.used + Math.max(row.pdf_audit_used, 0),
    reserved: total.reserved + Math.max(row.pdf_audit_reserved, 0),
  }), { limit: 0, used: 0, reserved: 0 });
  const consumed = creditTotals.used + creditTotals.reserved;
  const usageRatio = creditTotals.limit ? consumed / creditTotals.limit : 0;
  const attention = [
    (pastDue.count ?? 0) > 0 ? { label: `${pastDue.count} 筆訂閱需要處理`, href: "/admin/subscriptions?view=past_due", tone: "warning" as const } : null,
    usageRatio >= 0.9 ? { label: "有 Lab 接近 PDF 額度上限", href: "/admin/pdf-credits", tone: "warning" as const } : null,
    (suspended.count ?? 0) > 0 ? { label: `${suspended.count} 個帳號目前停用`, href: "/admin/users?status=suspended", tone: "danger" as const } : null,
  ].filter((item): item is { label: string; href: string; tone: "warning" | "danger" } => item !== null);

  return (
    <section>
      <AdminPageHeader eyebrow="Operations Overview" title="營運總覽" description="以真實資料掌握帳號、Lab、訂閱與 PDF shared pool 狀態。所有管理異動仍需進入對應頁面二次確認。" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="使用者" value={users.count ?? 0} detail="Profiles 總數" href="/admin/users" />
        <AdminMetricCard label="Active Labs" value={labs.count ?? 0} detail="目前營運中的 Lab" href="/admin/labs" />
        <AdminMetricCard label="功能性訂閱" value={subscriptions.data?.length ?? 0} detail="active / trialing / past_due" href="/admin/subscriptions" />
        <AdminMetricCard label="PDF Shared Pool" value={`${consumed} / ${creditTotals.limit}`} detail={`used ${creditTotals.used} · reserved ${creditTotals.reserved}`} href="/admin/pdf-credits" tone={usageRatio >= 0.9 ? "warning" : "default"} />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Needs Attention</p><h2 className="mt-2 text-xl font-semibold">需要處理</h2></div><span className="text-sm text-slate-500">{attention.length} 項</span></div><div className="mt-4 space-y-2">{attention.length ? attention.map((item) => <Link key={item.href} href={item.href} className={`flex justify-between rounded-xl border px-4 py-3 text-sm ${item.tone === "danger" ? "border-red-300/20 bg-red-400/[0.06] text-red-100" : "border-amber-300/20 bg-amber-400/[0.06] text-amber-100"}`}><span>{item.label}</span><span aria-hidden="true">→</span></Link>) : <p className="rounded-xl border border-emerald-300/15 bg-emerald-400/[0.05] px-4 py-4 text-sm text-emerald-100">目前沒有需要立即處理的營運項目。</p>}</div></section>
        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Recent Activity</p><h2 className="mt-2 text-xl font-semibold">最近操作</h2></div><Link href="/admin/action-logs" className="text-sm text-cyan-200 hover:text-white">查看全部</Link></div><div className="mt-4 divide-y divide-white/10">{actionRows.map((action) => { const actor = actionActors.get(action.admin_user_id); return <div key={action.id} className="py-3 first:pt-0"><div className="flex justify-between gap-3"><p className="text-sm font-medium text-slate-200">{action.action_type} · {action.target_type}</p><time className="text-xs text-slate-500">{new Date(action.created_at).toLocaleString("zh-TW")}</time></div><p className="mt-1 text-xs text-slate-400">執行者：{actor?.full_name ?? actor?.email ?? "Admin"} · 目標：{action.target_id ?? "-"}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">原因：{action.reason}</p><p className="mt-1 text-xs text-slate-600">{sanitizeAdminSnapshot(action.after_state) ? "已完成" : "已記錄"}</p></div>; })}{actionRows.length === 0 ? <p className="py-4 text-sm text-slate-500">目前沒有操作紀錄。</p> : null}</div></section>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-sm"><AdminStatusBadge status="active" label="系統運作中" /><Link href="/admin/users?q=" className="rounded-full border border-white/10 px-3 py-1.5 text-slate-300 hover:bg-white/[0.05]">搜尋帳號</Link></div>
    </section>
  );
}
