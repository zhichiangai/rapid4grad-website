"use client";

import { useState } from "react";

type PortalResponse = {
  success?: boolean;
  portalUrl?: string;
  error?: string;
};

export function CustomerPortalButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleOpenPortal() {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      });
      const payload = (await response.json()) as PortalResponse;

      if (response.status === 401) {
        window.location.href = "/login?next=/billing";
        return;
      }

      if (!response.ok || !payload.success || !payload.portalUrl) {
        setMessage(payload.error || "無法建立 Stripe Customer Portal。");
        return;
      }

      window.location.href = payload.portalUrl;
    } catch {
      setMessage("Customer Portal 開啟失敗，請稍後再試。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleOpenPortal}
        disabled={isLoading}
        className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
      >
        {isLoading ? "建立 Portal 中..." : "管理訂閱與付款方式"}
      </button>
      {message ? (
        <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {message}
        </p>
      ) : null}
    </div>
  );
}
