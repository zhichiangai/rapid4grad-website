import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { processVerifiedOneTimePayment } from "@/lib/payments/entitlements";
import { createV2AdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { provider: providerKey } = await context.params;

  let provider;
  try {
    provider = getPaymentProvider(providerKey);
  } catch {
    return jsonError("不支援此付款通知來源。", 404);
  }

  const rawBody = await request.text();
  let verifiedEvent;
  try {
    verifiedEvent = await provider.verifyWebhook({
      headers: request.headers,
      rawBody,
    });
  } catch (error) {
    console.error("Payment webhook verification failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      provider: provider.name,
    });
    return jsonError("付款通知驗證失敗。", 400);
  }

  try {
    const result = await processVerifiedOneTimePayment(
      createV2AdminClient(),
      provider.name,
      verifiedEvent,
    );
    const isSuccess = result.order_status === "paid";

    return NextResponse.json({
      success: true,
      duplicate: result.duplicate,
      orderId: result.order_id,
      orderStatus: result.order_status,
      requiresManualReview: result.requires_manual_review === true,
      redirectTo: isSuccess
        ? `/payment/success?orderId=${encodeURIComponent(result.order_id)}`
        : `/payment/fail?orderId=${encodeURIComponent(result.order_id)}`,
    });
  } catch (error) {
    console.error("Payment webhook transaction failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      provider: provider.name,
      eventId: verifiedEvent.eventId,
    });
    return jsonError("付款通知目前無法完成處理。", 500);
  }
}
