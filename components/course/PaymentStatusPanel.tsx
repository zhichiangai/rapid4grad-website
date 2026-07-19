"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type OrderStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded";

type StatusResponse = {
  success?: boolean;
  order?: { status: OrderStatus };
};

export function PaymentStatusPanel({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<OrderStatus>("processing");
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function checkStatus() {
      attempts += 1;
      try {
        const response = await fetch(
          `/api/payments/orders/${encodeURIComponent(orderId)}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as StatusResponse;

        if (!cancelled && response.ok && payload.success && payload.order) {
          setStatus(payload.order.status);
          setIsUnavailable(false);

          if (
            (payload.order.status === "pending" ||
              payload.order.status === "processing") &&
            attempts < 12
          ) {
            timeoutId = setTimeout(checkStatus, 2000);
          }
          return;
        }
      } catch {
        // The final state is presented below without exposing transport details.
      }

      if (!cancelled) {
        setIsUnavailable(true);
        if (attempts < 4) timeoutId = setTimeout(checkStatus, 2000);
      }
    }

    void checkStatus();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [orderId]);

  const paid = status === "paid";
  const stopped = ["failed", "cancelled", "expired", "refunded"].includes(
    status,
  );

  return (
    <div className="mt-6">
      <div
        className={`rounded-2xl border px-5 py-4 text-sm leading-6 ${
          paid
            ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
            : stopped
              ? "border-amber-300/20 bg-amber-400/10 text-amber-100"
              : "border-cyan-300/20 bg-cyan-400/10 text-cyan-100"
        }`}
      >
        {isUnavailable
          ? "目前無法讀取訂單狀態，請稍後重新整理。"
          : paid
            ? "付款已確認，永久完整課程權限已開通。"
            : stopped
              ? "這筆付款目前未完成，沒有新增課程權限。"
              : "正在等待付款服務確認，頁面會自動更新。"}
      </div>

      <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href={paid ? "/dashboard/course" : "/course"}
          className="rounded-2xl bg-cyan-400 px-5 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          {paid ? "進入完整課程" : "回課程頁"}
        </Link>
        <Link
          href="/dashboard"
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-center text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
        >
          回 Dashboard
        </Link>
      </div>
    </div>
  );
}
