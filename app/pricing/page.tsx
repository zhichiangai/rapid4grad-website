"use client";

import { useState } from "react";
import { BILLING_PLANS } from "@/lib/stripe/plans";
import type { SubscriptionPlanKey } from "@/types/database";

type CheckoutResponse = {
  success?: boolean;
  checkoutUrl?: string;
  error?: string;
};

const featureMap: Record<SubscriptionPlanKey, string[]> = {
  student_monthly: [
    "平台內 AI 稽核基礎額度",
    "研究報告與簡報 PDF 稽核",
    "保留 Phase 1 外部 AI 指令產生器",
  ],
  student_semester: [
    "較高 AI 稽核額度",
    "適合一整學期論文與組會追蹤",
    "保留 Phase 1 外部 AI 指令產生器",
  ],
  professor_lab: [
    "Lab 學生研究狀態總覽",
    "學生 AI 稽核摘要與風險追蹤",
    "適合教授端 Research Progress Management",
  ],
};

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlanKey | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleCheckout(planKey: SubscriptionPlanKey) {
    setLoadingPlan(planKey);
    setMessage(null);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planKey }),
      });
      const payload = (await response.json()) as CheckoutResponse;

      if (response.status === 401) {
        window.location.href = `/login?next=/pricing`;
        return;
      }

      if (!response.ok || !payload.success || !payload.checkoutUrl) {
        setMessage(payload.error || "無法建立 Stripe Checkout Session。");
        return;
      }

      window.location.href = payload.checkoutUrl;
    } catch {
      setMessage("付款頁建立失敗，請稍後再試。");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_52%,#020617_100%)] px-4 py-12 text-white">
      <section className="mx-auto w-full max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
          RAPID4GRAD BILLING
        </p>
        <div className="mt-5 max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Phase 2 訂閱方案
          </h1>
          <p className="mt-5 text-base leading-8 text-slate-300">
            訂閱方案用於平台內 AI 稽核、PDF 研究報告分析與教授端實驗室管理。
            Phase 1 的外部 AI 指令產生器仍保留為 fallback。
          </p>
        </div>

        {message ? (
          <p className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
            {message}
          </p>
        ) : null}

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {BILLING_PLANS.map((plan) => (
            <article
              key={plan.key}
              className="flex min-h-[30rem] flex-col rounded-[2rem] border border-white/10 bg-slate-950/72 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur"
            >
              <div>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-100">
                  {plan.audience === "student" ? "學生方案" : "教授方案"}
                </span>
                <h2 className="mt-5 text-2xl font-semibold text-white">
                  {plan.name}
                </h2>
                <p className="mt-3 min-h-16 text-sm leading-6 text-slate-400">
                  {plan.description}
                </p>
              </div>

              <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">{plan.priceLabel}</p>
                <p className="mt-2 text-sm font-medium text-cyan-200">
                  {plan.intervalLabel}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-slate-900/80 p-3">
                    <p className="text-slate-500">AI Credits</p>
                    <p className="mt-1 font-semibold text-white">
                      {plan.monthlyCreditLimit}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-900/80 p-3">
                    <p className="text-slate-500">PDF Audit</p>
                    <p className="mt-1 font-semibold text-white">
                      {plan.pdfAuditLimit}
                    </p>
                  </div>
                </div>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {featureMap[plan.key].map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-3 text-sm leading-6 text-slate-200"
                  >
                    <span className="mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-xs text-cyan-100">
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => void handleCheckout(plan.key)}
                disabled={loadingPlan !== null}
                className="mt-8 rounded-2xl bg-cyan-400 px-5 py-4 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                {loadingPlan === plan.key
                  ? "建立 Stripe Checkout 中..."
                  : "開始訂閱"}
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
