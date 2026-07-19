import { NextRequest, NextResponse } from "next/server";
import { getSubscriptionProvider } from "@/lib/subscriptions";
import { createV2AdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function ecpayResponse(success: boolean, message: string) {
  return new NextResponse(`${success ? "1" : "0"}|${message}`, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function addBillingPeriod(value: string, interval: "month" | "year") {
  const date = new Date(value);
  if (interval === "month") date.setUTCMonth(date.getUTCMonth() + 1);
  else date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString();
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  try {
    const notification = await getSubscriptionProvider().verifyNotification({
      rawBody,
    });
    const admin = createV2AdminClient();
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("subscription_id,subscriptions!inner(billing_interval)")
      .eq("provider", "ecpay")
      .eq("provider_order_id", notification.providerOrderId)
      .maybeSingle<{
        subscription_id: string;
        subscriptions: { billing_interval: "month" | "year" | "manual" };
      }>();

    if (
      orderError ||
      !order ||
      order.subscriptions.billing_interval === "manual"
    ) {
      console.error("ECPay subscription order lookup failed", {
        code: orderError?.code ?? "order_not_found",
      });
      return ecpayResponse(false, "OrderNotFound");
    }

    const { error } = await admin.rpc("process_professor_subscription_event", {
      target_provider_event_id: notification.eventId,
      target_provider_order_id: notification.providerOrderId,
      target_provider_payment_id: notification.providerPaymentId,
      target_outcome: notification.outcome,
      target_amount: notification.amount,
      target_currency: notification.currency,
      target_event_created_at: notification.eventCreatedAt,
      target_period_end: addBillingPeriod(
        notification.eventCreatedAt,
        order.subscriptions.billing_interval,
      ),
      target_payload: notification.rawPayload,
      target_error_code: notification.errorCode ?? undefined,
    });

    if (error) {
      console.error("ECPay subscription event processing failed", {
        code: error.code,
      });
      return ecpayResponse(false, "ProcessingFailed");
    }

    return ecpayResponse(true, "OK");
  } catch (error) {
    console.error("ECPay subscription notification rejected", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return ecpayResponse(false, "VerificationFailed");
  }
}
