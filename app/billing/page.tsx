import Link from "next/link";
import { redirect } from "next/navigation";
import { CancelSubscriptionButton } from "@/components/billing/CancelSubscriptionButton";
import { createV2Client } from "@/lib/supabase/server";

const labels: Record<string, string> = {
  incomplete: "付款設定中",
  trialing: "免費試用中",
  active: "使用中",
  past_due: "付款逾期（寬限期）",
  unpaid: "未付款／唯讀",
  canceled: "已取消／唯讀",
  expired: "已到期／唯讀",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "不適用";
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "long" }).format(new Date(value));
}

export default async function BillingPage() {
  const supabase = await createV2Client();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/billing");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id,lab_id,plan_key,status,billing_interval,current_period_start,current_period_end,trial_ends_at,grace_ends_at,cancel_at_period_end,provider,updated_at,labs(name)")
    .eq("payer_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = Date.now();
  const functional = Boolean(
    subscription &&
      (((subscription.status === "active" || subscription.status === "trialing") &&
        new Date(subscription.current_period_end).getTime() > now) ||
        (subscription.status === "past_due" &&
          subscription.grace_ends_at &&
          new Date(subscription.grace_ends_at).getTime() > now)),
  );
  const canCancel = Boolean(
    subscription &&
      !subscription.cancel_at_period_end &&
      ["trialing", "active", "past_due"].includes(subscription.status),
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.15),transparent_32rem),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] px-4 py-12 text-white">
      <section className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">Professor Billing</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Lab 訂閱管理</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">試用、月繳與年繳都綁定 Professor 自己擁有的 Lab，不使用學生個人訂閱。</p>
          </div>
          <Link href="/pricing" className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-slate-200 transition hover:border-cyan-300/30">查看方案</Link>
        </div>

        <section className="mt-10 rounded-[2rem] border border-white/10 bg-slate-950/76 p-7 shadow-2xl shadow-slate-950/40">
          {subscription ? (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">{subscription.plan_key === "professor_lab_plus" ? "Plus" : "Standard"}</h2>
                  <p className="mt-2 text-sm text-slate-400">{subscription.labs?.name ?? "Professor Lab"} · {subscription.billing_interval === "year" ? "年繳" : subscription.billing_interval === "month" ? "月繳" : "試用"}</p>
                </div>
                <span className={`rounded-full border px-4 py-2 text-sm font-semibold ${functional ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" : "border-slate-300/20 bg-slate-400/10 text-slate-200"}`}>{labels[subscription.status] ?? subscription.status}</span>
              </div>

              {!functional ? <p className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm leading-7 text-amber-100">目前為唯讀模式。既有 Lab 與歷史安全摘要可查看，但不能新增成員、觀看 Lab 影片或開始新的 PDF AI 稽核。</p> : null}
              {subscription.status === "past_due" && functional ? <p className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">付款逾期但仍在 15 天寬限期內，功能暫時維持至 {formatDate(subscription.grace_ends_at)}。</p> : null}

              <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-3xl bg-white/[0.04] p-5"><dt className="text-sm text-slate-500">目前週期</dt><dd className="mt-2 text-sm font-semibold">{formatDate(subscription.current_period_start)}<br />至 {formatDate(subscription.current_period_end)}</dd></div>
                <div className="rounded-3xl bg-white/[0.04] p-5"><dt className="text-sm text-slate-500">試用到期</dt><dd className="mt-2 font-semibold">{formatDate(subscription.trial_ends_at)}</dd></div>
                <div className="rounded-3xl bg-white/[0.04] p-5"><dt className="text-sm text-slate-500">付款寬限</dt><dd className="mt-2 font-semibold">{formatDate(subscription.grace_ends_at)}</dd></div>
                <div className="rounded-3xl bg-white/[0.04] p-5"><dt className="text-sm text-slate-500">續訂</dt><dd className="mt-2 font-semibold">{subscription.cancel_at_period_end ? "週期結束後停止" : subscription.provider === "manual" ? "試用不綁卡" : "自動續訂"}</dd></div>
              </dl>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/professor/dashboard" className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950">返回 Professor Dashboard</Link>
                {canCancel ? <CancelSubscriptionButton subscriptionId={subscription.id} /> : null}
              </div>
            </>
          ) : (
            <div className="text-center">
              <h2 className="text-2xl font-semibold">尚未啟用 Professor Lab 訂閱</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">可先建立 Lab，再啟用一次 30 天免綁卡試用。Standard／Plus 正式價格公告後才會開放綠界付款。</p>
              <Link href="/pricing" className="mt-6 inline-flex rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950">查看方案</Link>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-6">
          <h2 className="text-xl font-semibold">PDF AI 稽核額度</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">Standard 與 Plus 額度尚未定案。資料庫已保留 Lab shared pool 結構，Task 7 與 Admin 設定完成前不建立假額度。</p>
        </section>
      </section>
    </main>
  );
}
