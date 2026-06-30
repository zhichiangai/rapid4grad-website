import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerPortalButton } from "@/components/billing/CustomerPortalButton";
import { createClient } from "@/lib/supabase/server";
import { getBillingPlan } from "@/lib/stripe/plans";
import type { SubscriptionStatus } from "@/types/database";

type BillingSubscription = {
  id: string;
  status: SubscriptionStatus;
  plan_key: "student_monthly" | "student_semester" | "professor_lab";
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  stripe_customer_id: string;
  updated_at: string;
};

type BillingCredits = {
  monthly_credit_limit: number;
  credits_used: number;
  pdf_audit_limit: number;
  pdf_audit_used: number;
  period_start: string;
  period_end: string;
};

const statusLabel: Record<SubscriptionStatus, string> = {
  active: "使用中",
  trialing: "試用中",
  past_due: "付款逾期",
  canceled: "已取消",
  unpaid: "未付款",
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "尚未建立";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/billing");
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select(
      "id,status,plan_key,current_period_start,current_period_end,cancel_at_period_end,stripe_customer_id,updated_at",
    )
    .eq("user_id", user.id)
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle<BillingSubscription>();

  const { data: credits } = await supabase
    .from("ai_usage_credits")
    .select(
      "monthly_credit_limit,credits_used,pdf_audit_limit,pdf_audit_used,period_start,period_end",
    )
    .eq("user_id", user.id)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle<BillingCredits>();

  const plan = subscription ? getBillingPlan(subscription.plan_key) : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.15),transparent_32rem),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] px-4 py-12 text-white">
      <section className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
              BILLING
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              訂閱與 AI 額度
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
              這裡顯示 Stripe Billing 同步後的訂閱狀態、目前週期與 AI 稽核額度。
            </p>
          </div>
          <Link
            href="/pricing"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
          >
            查看方案
          </Link>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[2rem] border border-white/10 bg-slate-950/76 p-6 shadow-2xl shadow-slate-950/40">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">目前訂閱</h2>
                <p className="mt-2 text-sm text-slate-400">
                  {plan?.name ?? "尚未啟用 Phase 2 訂閱"}
                </p>
              </div>
              {subscription ? (
                <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100">
                  {statusLabel[subscription.status]}
                </span>
              ) : null}
            </div>

            {subscription ? (
              <dl className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-white/[0.04] p-5">
                  <dt className="text-sm text-slate-500">週期開始</dt>
                  <dd className="mt-2 font-semibold">
                    {formatDate(subscription.current_period_start)}
                  </dd>
                </div>
                <div className="rounded-3xl bg-white/[0.04] p-5">
                  <dt className="text-sm text-slate-500">週期結束</dt>
                  <dd className="mt-2 font-semibold">
                    {formatDate(subscription.current_period_end)}
                  </dd>
                </div>
                <div className="rounded-3xl bg-white/[0.04] p-5">
                  <dt className="text-sm text-slate-500">取消狀態</dt>
                  <dd className="mt-2 font-semibold">
                    {subscription.cancel_at_period_end
                      ? "週期結束後取消"
                      : "自動續訂中"}
                  </dd>
                </div>
                <div className="rounded-3xl bg-white/[0.04] p-5">
                  <dt className="text-sm text-slate-500">最後同步</dt>
                  <dd className="mt-2 font-semibold">
                    {formatDate(subscription.updated_at)}
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="mt-8 rounded-3xl border border-amber-300/20 bg-amber-400/10 p-5 text-sm leading-7 text-amber-100">
                尚未找到有效訂閱。你可以先到 pricing 頁選擇方案；Phase 1
                課程權限與一次性付款 fallback 不受這裡影響。
              </div>
            )}

            <div className="mt-8">
              {subscription?.stripe_customer_id ? (
                <CustomerPortalButton />
              ) : (
                <Link
                  href="/pricing"
                  className="inline-flex rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  前往訂閱方案
                </Link>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-slate-950/76 p-6 shadow-2xl shadow-slate-950/40">
            <h2 className="text-2xl font-semibold">AI 額度</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              額度由 Stripe webhook 依訂閱週期補充。逾期付款時高成本 PDF
              稽核會被限制。
            </p>

            {credits ? (
              <div className="mt-8 space-y-4">
                <div className="rounded-3xl bg-white/[0.04] p-5">
                  <p className="text-sm text-slate-500">文字 / AI 稽核額度</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {credits.credits_used} / {credits.monthly_credit_limit}
                  </p>
                </div>
                <div className="rounded-3xl bg-white/[0.04] p-5">
                  <p className="text-sm text-slate-500">PDF Audit 額度</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {credits.pdf_audit_used} / {credits.pdf_audit_limit}
                  </p>
                </div>
                <p className="text-xs leading-5 text-slate-500">
                  額度週期：{formatDate(credits.period_start)} 到{" "}
                  {formatDate(credits.period_end)}
                </p>
              </div>
            ) : (
              <p className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-slate-400">
                尚未建立 AI 額度紀錄。訂閱付款成功並收到 Stripe webhook
                後會自動建立。
              </p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
