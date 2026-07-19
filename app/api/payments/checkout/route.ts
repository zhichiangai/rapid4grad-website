import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  createV2AdminClient,
  createV2Client,
} from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";
import type {
  CheckoutOrder,
  CheckoutProduct,
  CreateCheckoutResult,
} from "@/lib/payments";

export const runtime = "nodejs";

type CheckoutRequestBody = {
  idempotencyKey?: unknown;
};

type CheckoutOrderRow = {
  order_id: string;
  user_id: string;
  product_id: string;
  product_price_id: string;
  product_slug: string;
  product_name: string;
  product_type: "course" | "professor_subscription" | "consultation" | "bundle" | "ai_credits";
  product_metadata: CheckoutProduct["metadata"];
  amount: number;
  currency: string;
  provider: CheckoutOrder["provider"];
  provider_order_id: string | null;
  order_status: "pending" | "processing" | "paid" | "failed" | "cancelled" | "expired" | "refunded";
  checkout_url: string | null;
  is_lab_discount: boolean;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function normalizeIdempotencyKey(value: unknown) {
  if (
    typeof value === "string" &&
    value.length >= 16 &&
    value.length <= 128 &&
    /^[A-Za-z0-9_-]+$/.test(value)
  ) {
    return value;
  }

  return randomUUID();
}

function getCheckoutUrl(checkout: CreateCheckoutResult) {
  return checkout.mode === "redirect" ? checkout.checkoutUrl : checkout.actionUrl;
}

function mapCheckoutRpcError(message: string) {
  if (message.includes("course_already_owned")) {
    return { message: "你已經擁有完整課程權限。", status: 409 };
  }

  if (message.includes("course_price_not_available")) {
    return { message: "課程價格尚未公告。", status: 503 };
  }

  return { message: "目前無法建立付款訂單。", status: 500 };
}

export async function POST(request: NextRequest) {
  const supabase = await createV2Client();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Course checkout authentication failed", {
      code: userError.code,
    });
  }

  if (!user?.email) {
    return jsonError("請先登入再購買課程。", 401);
  }

  let body: CheckoutRequestBody = {};
  try {
    body = (await request.json()) as CheckoutRequestBody;
  } catch {
    body = {};
  }

  let provider;
  try {
    provider = getPaymentProvider();
  } catch (error) {
    console.error("Course checkout provider unavailable", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonError("付款服務尚未啟用。", 503);
  }

  const admin = createV2AdminClient();
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey);
  const { data, error: orderError } = await admin.rpc(
    "create_student_course_checkout_order",
    {
      target_user_id: user.id,
      target_provider: provider.name,
      target_idempotency_key: idempotencyKey,
    },
  );

  if (orderError || !data?.[0]) {
    const mapped = mapCheckoutRpcError(orderError?.message ?? "unknown");
    console.error("Course checkout order creation failed", {
      code: orderError?.code ?? "NO_ORDER",
      userId: user.id,
    });
    return jsonError(mapped.message, mapped.status);
  }

  const orderRow = data[0] as CheckoutOrderRow;

  if (
    orderRow.order_status === "processing" &&
    orderRow.checkout_url?.startsWith(request.nextUrl.origin)
  ) {
    return NextResponse.json({
      success: true,
      orderId: orderRow.order_id,
      pricing: orderRow.is_lab_discount ? "lab_discount" : "standard",
      checkout: {
        mode: "redirect",
        checkoutUrl: orderRow.checkout_url,
      },
    });
  }

  const providerOrderId =
    orderRow.provider_order_id ?? `${provider.name}_${orderRow.order_id}`;
  const { error: providerOrderError } = await admin
    .from("orders")
    .update({ provider_order_id: providerOrderId })
    .eq("id", orderRow.order_id)
    .eq("user_id", user.id);

  if (providerOrderError) {
    console.error("Course checkout provider order update failed", {
      code: providerOrderError.code,
      orderId: orderRow.order_id,
    });
    return jsonError("目前無法準備付款訂單。", 500);
  }

  const product: CheckoutProduct = {
    id: orderRow.product_id,
    slug: orderRow.product_slug,
    name: orderRow.product_name,
    productType: orderRow.product_type,
    amount: orderRow.amount,
    currency: orderRow.currency,
    metadata: orderRow.product_metadata ?? {},
  };
  const order: CheckoutOrder = {
    id: orderRow.order_id,
    userId: orderRow.user_id,
    productId: orderRow.product_id,
    productPriceId: orderRow.product_price_id,
    amount: orderRow.amount,
    currency: orderRow.currency,
    provider: provider.name,
    providerOrderId,
  };

  try {
    const origin = request.nextUrl.origin;
    const checkout = await provider.createCheckout({
      order,
      product,
      customer: {
        email: user.email,
        name:
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name.slice(0, 120)
            : null,
      },
      successUrl: `${origin}/payment/success?orderId=${order.id}`,
      failUrl: `${origin}/payment/fail?orderId=${order.id}`,
    });

    const { error: checkoutUpdateError } = await admin
      .from("orders")
      .update({
        status: "processing",
        checkout_url: getCheckoutUrl(checkout),
        provider_order_id: checkout.providerOrderId,
        raw_checkout_payload: checkout.rawPayload ?? {},
      })
      .eq("id", order.id)
      .eq("user_id", user.id);

    if (checkoutUpdateError) {
      console.error("Course checkout persistence failed", {
        code: checkoutUpdateError.code,
        orderId: order.id,
      });
      return jsonError("目前無法準備付款頁面。", 500);
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      pricing: orderRow.is_lab_discount ? "lab_discount" : "standard",
      checkout:
        checkout.mode === "redirect"
          ? { mode: "redirect", checkoutUrl: checkout.checkoutUrl }
          : {
              mode: "form_post",
              actionUrl: checkout.actionUrl,
              fields: checkout.fields,
            },
    });
  } catch (error) {
    await admin
      .from("orders")
      .update({ status: "failed" })
      .eq("id", order.id)
      .eq("user_id", user.id);
    console.error("Course checkout provider failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      provider: provider.name,
      orderId: order.id,
    });
    return jsonError("付款服務目前無法建立結帳頁面。", 502);
  }
}
