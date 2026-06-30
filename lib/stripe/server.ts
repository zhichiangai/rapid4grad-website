import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { BILLING_PLANS, type BillingPlan } from "@/lib/stripe/plans";
import type { Json } from "@/types/database";

export type StripeCheckoutSession = {
  id: string;
  mode?: string | null;
  customer?: string | null;
  customer_email?: string | null;
  client_reference_id?: string | null;
  subscription?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  payment_status?: string | null;
  payment_intent?: string | null;
  metadata?: Record<string, string> | null;
  customer_details?: {
    email?: string | null;
  } | null;
};

export type StripeSubscription = {
  id: string;
  customer?: string | null;
  status?: string | null;
  current_period_start?: number | null;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean | null;
  metadata?: Record<string, string> | null;
  items?: {
    data?: Array<{
      id?: string;
      quantity?: number | null;
      price?: {
        id?: string;
      } | null;
    }>;
  } | null;
};

export type StripeInvoice = {
  id: string;
  customer?: string | null;
  subscription?: string | null;
  status?: string | null;
  amount_paid?: number | null;
  currency?: string | null;
  period_start?: number | null;
  period_end?: number | null;
  lines?: {
    data?: Array<{
      period?: {
        start?: number | null;
        end?: number | null;
      } | null;
      price?: {
        id?: string;
      } | null;
    }>;
  } | null;
};

export type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: Json;
  };
};

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const STRIPE_API_VERSION = "2024-06-20";

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function getBillingPlanByPriceId(priceId: string | null | undefined) {
  if (!priceId) {
    return null;
  }

  return (
    BILLING_PLANS.find(
      (plan) => process.env[plan.stripePriceEnv] === priceId,
    ) ?? null
  );
}

export function getBillingPlanPriceId(plan: BillingPlan) {
  const priceId = process.env[plan.stripePriceEnv];

  if (!priceId) {
    throw new Error(`${plan.stripePriceEnv} is not configured.`);
  }

  return priceId;
}

function getStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  return secretKey;
}

function appendNestedParam(
  params: URLSearchParams,
  key: string,
  value: string | number | boolean | null | undefined,
) {
  if (value === null || value === undefined) {
    return;
  }

  params.append(key, String(value));
}

async function stripeRequest<T>(
  path: string,
  params: URLSearchParams,
): Promise<T> {
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": STRIPE_API_VERSION,
    },
    body: params,
    cache: "no-store",
  });

  const payload = (await response.json()) as T & {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || "Stripe request failed.");
  }

  return payload;
}

export async function createSubscriptionCheckoutSession(input: {
  userId: string;
  email: string;
  plan: BillingPlan;
  priceId: string;
  existingCustomerId?: string | null;
}) {
  const siteUrl = getSiteUrl();
  const params = new URLSearchParams();

  appendNestedParam(params, "mode", "subscription");
  appendNestedParam(params, "line_items[0][price]", input.priceId);
  appendNestedParam(params, "line_items[0][quantity]", 1);
  appendNestedParam(
    params,
    "success_url",
    `${siteUrl}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
  );
  appendNestedParam(params, "cancel_url", `${siteUrl}/pricing?checkout=cancel`);
  appendNestedParam(params, "client_reference_id", input.userId);
  appendNestedParam(params, "metadata[user_id]", input.userId);
  appendNestedParam(params, "metadata[plan_key]", input.plan.key);
  appendNestedParam(params, "subscription_data[metadata][user_id]", input.userId);
  appendNestedParam(
    params,
    "subscription_data[metadata][plan_key]",
    input.plan.key,
  );

  if (input.existingCustomerId) {
    appendNestedParam(params, "customer", input.existingCustomerId);
  } else {
    appendNestedParam(params, "customer_email", input.email);
  }

  return stripeRequest<{ id: string; url: string | null }>(
    "/checkout/sessions",
    params,
  );
}

export async function createCustomerPortalSession(input: {
  customerId: string;
}) {
  const params = new URLSearchParams();

  appendNestedParam(params, "customer", input.customerId);
  appendNestedParam(params, "return_url", `${getSiteUrl()}/billing`);

  return stripeRequest<{ id: string; url: string }>("/billing_portal/sessions", params);
}

export async function retrieveStripeSubscription(subscriptionId: string) {
  const response = await fetch(
    `${STRIPE_API_BASE}/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getStripeSecretKey()}`,
        "Stripe-Version": STRIPE_API_VERSION,
      },
      cache: "no-store",
    },
  );

  const payload = (await response.json()) as StripeSubscription & {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || "Stripe subscription fetch failed.");
  }

  return payload;
}

function parseStripeSignature(signatureHeader: string) {
  return signatureHeader.split(",").reduce(
    (acc, part) => {
      const [key, value] = part.split("=");
      if (key === "t") {
        acc.timestamp = value;
      }
      if (key === "v1") {
        acc.signatures.push(value);
      }
      return acc;
    },
    { timestamp: "", signatures: [] as string[] },
  );
}

export function verifyStripeSignature({
  payload,
  signatureHeader,
  webhookSecret,
  toleranceInSeconds = 300,
}: {
  payload: string;
  signatureHeader: string;
  webhookSecret: string;
  toleranceInSeconds?: number;
}) {
  const { timestamp, signatures } = parseStripeSignature(signatureHeader);

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const timestampInSeconds = Number(timestamp);
  const currentTimestampInSeconds = Math.floor(Date.now() / 1000);

  if (
    !Number.isFinite(timestampInSeconds) ||
    Math.abs(currentTimestampInSeconds - timestampInSeconds) >
      toleranceInSeconds
  ) {
    return false;
  }

  const expectedSignature = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  return signatures.some((signature) => {
    const receivedBuffer = Buffer.from(signature, "hex");

    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(receivedBuffer, expectedBuffer);
  });
}

export function unixSecondsToIso(value: number | null | undefined) {
  if (!value) {
    return new Date().toISOString();
  }

  return new Date(value * 1000).toISOString();
}

export function getInvoicePeriod(invoice: StripeInvoice) {
  const linePeriod = invoice.lines?.data?.[0]?.period;

  return {
    start:
      linePeriod?.start ??
      invoice.period_start ??
      Math.floor(Date.now() / 1000),
    end:
      linePeriod?.end ??
      invoice.period_end ??
      Math.floor(Date.now() / 1000),
  };
}
