"use client";

import { useState } from "react";

type Outcome = "completed" | "failed" | "cancelled";

type WebhookResponse = {
  success?: boolean;
  error?: string;
  redirectTo?: string;
};

export function TestCheckoutPanel({ token }: { token: string }) {
  const [pendingOutcome, setPendingOutcome] = useState<Outcome | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submitOutcome(outcome: Outcome) {
    setPendingOutcome(outcome);
    setMessage(null);

    try {
      const response = await fetch("/api/payments/webhook/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, outcome }),
      });
      const payload = (await response.json()) as WebhookResponse;

      if (!response.ok || !payload.success || !payload.redirectTo) {
        setMessage(payload.error ?? "測試付款處理失敗。");
        return;
      }

      window.location.assign(payload.redirectTo);
    } catch {
      setMessage("測試付款處理失敗。");
    } finally {
      setPendingOutcome(null);
    }
  }

  return (
    <div className="mt-8 space-y-3">
      <button
        type="button"
        disabled={pendingOutcome !== null}
        onClick={() => submitOutcome("completed")}
        className="w-full rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pendingOutcome === "completed" ? "處理中..." : "模擬付款成功"}
      </button>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={pendingOutcome !== null}
          onClick={() => submitOutcome("failed")}
          className="rounded-2xl border border-red-300/20 bg-red-400/10 px-5 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendingOutcome === "failed" ? "處理中..." : "模擬付款失敗"}
        </button>
        <button
          type="button"
          disabled={pendingOutcome !== null}
          onClick={() => submitOutcome("cancelled")}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendingOutcome === "cancelled" ? "處理中..." : "模擬取消付款"}
        </button>
      </div>
      {message ? (
        <p className="rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-100">
          {message}
        </p>
      ) : null}
    </div>
  );
}
