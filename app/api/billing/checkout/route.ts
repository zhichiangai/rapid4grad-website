import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  createSubscriptionCheckoutSession,
  getBillingPlanPriceId,
} from "@/lib/stripe/server";
import { getBillingPlan } from "@/lib/stripe/plans";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

type CheckoutRequestBody = {
  planKey?: unknown;
};

function jsonError(message: string, status = 400, extra?: Record<string, Json>) {
  return NextResponse.json(
    { success: false, error: message, ...extra },
    { status },
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Billing checkout auth failed", { code: userError.code });
    return jsonError("Unable to verify the current session.", 401);
  }

  if (!user?.email) {
    return jsonError("Login is required before subscription checkout.", 401);
  }

  let body: CheckoutRequestBody;

  try {
    body = (await request.json()) as CheckoutRequestBody;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (typeof body.planKey !== "string") {
    return jsonError("planKey is required.", 400);
  }

  const plan = getBillingPlan(body.planKey);

  if (!plan) {
    return jsonError("Unsupported billing plan.", 400);
  }

  let priceId: string;

  try {
    priceId = getBillingPlanPriceId(plan);
  } catch (error) {
    console.error("Billing price configuration failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonError("Subscription checkout is currently unavailable.", 503);
  }

  const admin = createAdminClient();
  const { data: existingSubscription, error: existingSubscriptionError } =
    await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (existingSubscriptionError) {
    console.error("Billing subscription lookup failed", {
      code: existingSubscriptionError.code,
    });
    return jsonError("Subscription checkout is currently unavailable.", 503);
  }

  try {
    const session = await createSubscriptionCheckoutSession({
      userId: user.id,
      email: user.email,
      plan,
      priceId,
      existingCustomerId: existingSubscription?.stripe_customer_id ?? null,
    });

    if (!session.url) {
      return jsonError("Stripe did not return a checkout URL.", 500);
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Stripe subscription checkout failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonError("Subscription checkout could not be started.", 502);
  }
}
