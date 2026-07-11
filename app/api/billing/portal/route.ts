import { NextResponse } from "next/server";
import { createCustomerPortalSession } from "@/lib/stripe/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

function jsonError(message: string, status = 400, extra?: Record<string, Json>) {
  return NextResponse.json(
    { success: false, error: message, ...extra },
    { status },
  );
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Billing portal auth failed", { code: userError.code });
    return jsonError("Unable to verify the current session.", 401);
  }

  if (!user) {
    return jsonError("Login is required before opening billing portal.", 401);
  }

  const admin = createAdminClient();
  const { data: subscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) {
    console.error("Billing portal subscription lookup failed", {
      code: subscriptionError.code,
    });
    return jsonError("Billing details are currently unavailable.", 503);
  }

  if (!subscription?.stripe_customer_id) {
    return jsonError("No Stripe customer exists for this account.", 404);
  }

  try {
    const portal = await createCustomerPortalSession({
      customerId: subscription.stripe_customer_id,
    });

    return NextResponse.json({
      success: true,
      portalUrl: portal.url,
      sessionId: portal.id,
    });
  } catch (error) {
    console.error("Stripe customer portal creation failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonError("Billing portal could not be opened.", 502);
  }
}
