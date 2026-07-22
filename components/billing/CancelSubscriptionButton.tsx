"use client";

import { useState } from "react";

export function CancelSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function cancel() {
    if (!window.confirm("確定停止後續自動續訂嗎？已付款功能會保留到目前週期結束。")) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) {
        setMessage(payload.error ?? "取消失敗，請稍後再試。");
        return;
      }
      window.location.reload();
    } catch {
      setMessage("取消服務暫時無法連線。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={() => void cancel()} disabled={loading} className="rounded-2xl border border-red-300/20 bg-red-400/10 px-5 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-400/15 disabled:opacity-50">
        {loading ? "處理中..." : "停止自動續訂"}
      </button>
      {message ? <p className="mt-3 text-sm text-red-200">{message}</p> : null}
    </div>
  );
}
