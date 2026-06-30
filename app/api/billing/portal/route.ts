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
    return jsonError(userError.message, 401);
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
    return jsonError(subscriptionError.message, 500);
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
    const message =
      error instanceof Error
        ? error.message
        : "Stripe Customer Portal session failed.";
    return jsonError(message, 500);
  }
}
