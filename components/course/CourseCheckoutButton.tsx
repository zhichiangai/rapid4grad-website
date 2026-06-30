"use client";

import { useState } from "react";

type CheckoutResponse = {
  success?: boolean;
  checkout?:
    | {
        mode: "redirect";
        checkoutUrl: string;
      }
    | {
        mode: "form_post";
        actionUrl: string;
        fields: Record<string, string>;
      };
  error?: string;
};

function submitFormPostCheckout({
  actionUrl,
  fields,
}: {
  actionUrl: string;
  fields: Record<string, string>;
}) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = actionUrl;
  form.style.display = "none";

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

export function CourseCheckoutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleCheckout() {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productSlug: "rapid4grad-course" }),
      });
      const payload = (await response.json()) as CheckoutResponse;

      if (response.status === 401) {
        window.location.href = "/login?next=/course";
        return;
      }

      if (!response.ok || !payload.success || !payload.checkout) {
        const errorMessage =
          payload.error === "Not implemented"
            ? "Payment provider not implemented."
            : payload.error || "Payment checkout failed.";
        setMessage(errorMessage);
        return;
      }

      if (payload.checkout.mode === "redirect") {
        window.location.href = payload.checkout.checkoutUrl;
        return;
      }

      submitFormPostCheckout({
        actionUrl: payload.checkout.actionUrl,
        fields: payload.checkout.fields,
      });
    } catch {
      setMessage("Payment checkout failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={isLoading}
        className="flex w-full items-center justify-center rounded-2xl bg-blue-500 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
      >
        {isLoading ? "建立訂單中..." : "立即購買"}
      </button>
      {message ? (
        <p className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-center text-xs leading-5 text-amber-100">
          {message}
        </p>
      ) : null}
    </div>
  );
}
