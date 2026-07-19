"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  ProfessorPlanKey,
  SubscriptionBillingInterval,
} from "@/lib/subscriptions";

type CurrentSubscription = {
  id: string;
  status: string;
  plan_key: string;
  billing_interval: string;
};

type Props = {
  isAuthenticated: boolean;
  lab: { id: string; name: string } | null;
  trialAlreadyUsed: boolean;
  currentSubscription: CurrentSubscription | null;
  prices: Partial<
    Record<`${ProfessorPlanKey}:${SubscriptionBillingInterval}`, number>
  >;
};

type ApiResponse = {
  success?: boolean;
  error?: string;
  checkout?: {
    mode: "form_post";
    actionUrl: string;
    fields: Record<string, string>;
  };
};

const plans: Array<{
  key: ProfessorPlanKey;
  name: string;
  seats: string;
  description: string;
  features: string[];
}> = [
  {
    key: "professor_lab_standard",
    name: "Standard",
    seats: "0–15 位 active students",
    description: "適合一般研究團隊，提供 Lab 管理、部分課程與團隊 PDF AI 稽核框架。",
    features: ["最多 15 位學生", "最多 3 位助教", "Professor Dashboard", "30 天免綁卡試用"],
  },
  {
    key: "professor_lab_plus",
    name: "Plus",
    seats: "0–30 位 active students",
    description: "適合較大型研究團隊；第 16 位學生加入前必須先升級至 Plus。",
    features: ["最多 30 位學生", "最多 3 位助教", "Professor Dashboard", "30 天免綁卡試用"],
  },
];

function formatPrice(amount: number | undefined, interval: SubscriptionBillingInterval) {
  if (!amount) return "價格待公告";
  return `NT$ ${new Intl.NumberFormat("zh-TW").format(amount)} / ${
    interval === "month" ? "月" : "年"
  }`;
}

function submitCheckoutForm(actionUrl: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = actionUrl;
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

export function ProfessorPricingClient({
  isAuthenticated,
  lab,
  trialAlreadyUsed,
  currentSubscription,
  prices,
}: Props) {
  const [intervals, setIntervals] = useState<
    Record<ProfessorPlanKey, SubscriptionBillingInterval>
  >({ professor_lab_standard: "month", professor_lab_plus: "month" });
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function callApi(
    endpoint: "/api/billing/trial" | "/api/billing/checkout",
    planKey: ProfessorPlanKey,
  ) {
    if (!isAuthenticated) {
      window.location.href = "/login?next=/pricing";
      return;
    }
    if (!lab) {
      setMessage("請先到 Professor Dashboard 建立一個 Lab。試用與訂閱都會綁定該 Lab。");
      return;
    }

    const action = endpoint.endsWith("trial") ? "trial" : "checkout";
    setLoading(`${planKey}:${action}`);
    setMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labId: lab.id,
          planKey,
          billingInterval: intervals[planKey],
          checkoutAttemptId: crypto.randomUUID(),
        }),
      });
      const payload = (await response.json()) as ApiResponse;

      if (!response.ok || !payload.success) {
        setMessage(payload.error ?? "目前無法完成此操作。");
        return;
      }

      if (payload.checkout) {
        submitCheckoutForm(payload.checkout.actionUrl, payload.checkout.fields);
        return;
      }

      window.location.href = "/professor/dashboard";
    } catch {
      setMessage("服務暫時無法連線，請稍後再試。");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_52%,#020617_100%)] px-4 py-12 text-white">
      <section className="mx-auto w-full max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
          Professor Lab Plans
        </p>
        <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
          一個月免綁卡試用，再決定月繳或年繳
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
          訂閱綁定 Professor 自己建立的單一 Lab。Standard 最多 15 位學生，Plus 最多 30 位；PDF 額度將由管理者後台設定，目前不顯示假額度。
        </p>

        {lab ? (
          <p className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-5 py-4 text-sm text-cyan-100">
            本次試用／訂閱將綁定：{lab.name}
          </p>
        ) : null}
        {currentSubscription ? (
          <p className="mt-4 rounded-2xl border border-blue-300/20 bg-blue-400/10 px-5 py-4 text-sm text-blue-100">
            目前狀態：{currentSubscription.plan_key} · {currentSubscription.status} · {currentSubscription.billing_interval}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
            {message}
          </p>
        ) : null}

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {plans.map((plan) => {
            const interval = intervals[plan.key];
            const amount = prices[`${plan.key}:${interval}`];
            const trialDisabled = trialAlreadyUsed || Boolean(currentSubscription);
            const paidSubscriptionNeedsSupport = Boolean(
              currentSubscription &&
                ["active", "past_due", "unpaid"].includes(
                  currentSubscription.status,
                ) &&
                (currentSubscription.plan_key !== plan.key ||
                  currentSubscription.billing_interval !== interval),
            );
            const alreadySubscribed = Boolean(
              currentSubscription?.status === "active" &&
                currentSubscription.plan_key === plan.key &&
                currentSubscription.billing_interval === interval,
            );
            return (
              <article key={plan.key} className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-7 shadow-2xl shadow-slate-950/40">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-semibold">{plan.name}</h2>
                    <p className="mt-2 text-sm font-medium text-cyan-200">{plan.seats}</p>
                  </div>
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">30 天試用</span>
                </div>
                <p className="mt-5 min-h-14 text-sm leading-7 text-slate-400">{plan.description}</p>

                <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-2">
                  {(["month", "year"] as const).map((candidate) => (
                    <button
                      type="button"
                      key={candidate}
                      onClick={() => setIntervals((current) => ({ ...current, [plan.key]: candidate }))}
                      className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                        interval === candidate
                          ? "bg-cyan-400 text-slate-950"
                          : "text-slate-300 hover:bg-white/[0.06]"
                      }`}
                    >
                      {candidate === "month" ? "月繳" : "年繳"}
                    </button>
                  ))}
                </div>

                <p className="mt-6 text-2xl font-semibold">{formatPrice(amount, interval)}</p>
                <p className="mt-2 text-xs text-slate-500">正式付款由綠界定期定額處理；價格公告前不會建立付款單。</p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm text-slate-200"><span className="text-cyan-300">✓</span>{feature}</li>
                  ))}
                </ul>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={loading !== null || trialDisabled}
                    onClick={() => void callApi("/api/billing/trial", plan.key)}
                    className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {loading === `${plan.key}:trial` ? "啟用中..." : trialAlreadyUsed ? "已使用過試用" : "免綁卡試用 30 天"}
                  </button>
                  <button
                    type="button"
                    disabled={
                      loading !== null ||
                      !amount ||
                      !lab ||
                      alreadySubscribed
                    }
                    onClick={() => {
                      if (paidSubscriptionNeedsSupport) {
                        setMessage(
                          "綠界無法安全地自動換方案或週期，請聯絡客服處理，避免兩筆定期扣款同時存在。",
                        );
                        return;
                      }
                      void callApi("/api/billing/checkout", plan.key);
                    }}
                    className="rounded-2xl bg-cyan-400 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                  >
                    {loading === `${plan.key}:checkout`
                      ? "前往綠界..."
                      : alreadySubscribed
                        ? "目前使用中"
                        : paidSubscriptionNeedsSupport
                          ? "聯絡客服變更"
                          : amount
                            ? "開始正式訂閱"
                            : "價格待公告"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.035] p-6">
          <h2 className="text-xl font-semibold">31 位以上</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">不提供自助結帳，請聯絡 RAPID4GRAD 規劃 Enterprise 方案。</p>
          {!lab ? <Link href="/professor/dashboard" className="mt-4 inline-flex text-sm font-semibold text-cyan-200 hover:text-cyan-100">先建立 Professor Lab →</Link> : null}
        </div>
      </section>
    </main>
  );
}
