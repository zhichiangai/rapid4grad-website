import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { Json } from "@/types/database-v2.generated";
import type {
  CreateCheckoutInput,
  PaymentProvider,
  VerifyWebhookResult,
} from "../types";
import {
  createTestPaymentToken,
  verifyTestPaymentToken,
  type TestCheckoutPayload,
} from "../test-provider-token";

type TestWebhookBody = {
  token?: unknown;
  outcome?: unknown;
};

const OUTCOMES = ["completed", "failed", "cancelled", "refunded"] as const;

function parseWebhookBody(rawBody: string): {
  token: string;
  outcome: VerifyWebhookResult["outcome"];
} {
  if (rawBody.length > 8192) throw new Error("Test webhook body is too large");

  let body: TestWebhookBody;
  try {
    body = JSON.parse(rawBody) as TestWebhookBody;
  } catch {
    throw new Error("Invalid test webhook body");
  }

  if (typeof body.token !== "string" || typeof body.outcome !== "string") {
    throw new Error("Invalid test webhook body");
  }

  if (!OUTCOMES.includes(body.outcome as (typeof OUTCOMES)[number])) {
    throw new Error("Invalid test payment outcome");
  }

  return {
    token: body.token,
    outcome: body.outcome as VerifyWebhookResult["outcome"],
  };
}

export const testPaymentProvider: PaymentProvider = {
  name: "manual",
  async createCheckout(input: CreateCheckoutInput) {
    const payload: TestCheckoutPayload = {
      version: 1,
      providerOrderId: input.order.providerOrderId,
      amount: input.order.amount,
      currency: input.order.currency.toUpperCase(),
      expiresAt: Date.now() + 30 * 60 * 1000,
      nonce: randomUUID(),
    };
    const token = createTestPaymentToken(payload);
    const checkoutUrl = new URL("/payment/test-checkout", input.successUrl);
    checkoutUrl.searchParams.set("token", token);

    return {
      mode: "redirect",
      checkoutUrl: checkoutUrl.toString(),
      providerOrderId: input.order.providerOrderId,
      rawPayload: {
        provider: "local_test",
        expiresAt: new Date(payload.expiresAt).toISOString(),
      },
    };
  },
  async verifyWebhook({ rawBody }) {
    const { token, outcome } = parseWebhookBody(rawBody);
    const payload = verifyTestPaymentToken(token);
    const digest = createHash("sha256")
      .update(`${token}:${outcome}`)
      .digest("hex");
    const paidAt = new Date().toISOString();

    return {
      eventId: `test_event_${digest}`,
      eventType: `test.checkout.${outcome}`,
      providerOrderId: payload.providerOrderId,
      providerPaymentId: `test_payment_${createHash("sha256")
        .update(payload.providerOrderId)
        .digest("hex")}`,
      outcome,
      amount: payload.amount,
      currency: payload.currency,
      paidAt:
        outcome === "completed" || outcome === "refunded"
          ? paidAt
          : undefined,
      rawPayload: {
        provider: "local_test",
        outcome,
        providerOrderId: payload.providerOrderId,
      } as Json,
    };
  },
};
