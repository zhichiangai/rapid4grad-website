import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";
import type {
  CheckoutOrder,
  CheckoutProduct,
  CreateCheckoutResult,
  PaymentProviderName,
  ProductSlug,
} from "@/lib/payments";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

type CheckoutRequestBody = {
  productSlug?: unknown;
};

const DEFAULT_PRODUCT_SLUG: ProductSlug = "rapid4grad-course";

function jsonError(message: string, status = 400, extra?: Record<string, Json>) {
  return NextResponse.json(
    { success: false, error: message, ...extra },
    { status },
  );
}

function normalizeProductSlug(value: unknown): ProductSlug {
  if (value === "rapid4grad-course") {
    return value;
  }

  return DEFAULT_PRODUCT_SLUG;
}

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function getCheckoutUrl(checkout: CreateCheckoutResult) {
  return checkout.mode === "redirect" ? checkout.checkoutUrl : checkout.actionUrl;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return jsonError(userError.message, 401);
  }

  if (!user?.email) {
    return jsonError("Login is required before checkout.", 401);
  }

  let body: CheckoutRequestBody = {};

  try {
    body = (await request.json()) as CheckoutRequestBody;
  } catch {
    body = {};
  }

  const productSlug = normalizeProductSlug(body.productSlug);
  const provider = getPaymentProvider();
  const siteUrl = getSiteUrl();
  const admin = createAdminClient();

  const { data: productRow, error: productError } = await admin
    .from("products")
    .select("id,slug,name,product_type,amount,currency,duration_months,metadata")
    .eq("slug", productSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (productError) {
    return jsonError(productError.message, 500);
  }

  if (!productRow) {
    return jsonError("Product is not available.", 404);
  }

  const { data: orderRow, error: orderError } = await admin
    .from("orders")
    .insert({
      user_id: user.id,
      product_id: productRow.id,
      amount: productRow.amount,
      currency: productRow.currency,
      status: "pending",
      provider: provider.name,
    })
    .select("id,user_id,product_id,amount,currency,provider")
    .single();

  if (orderError) {
    return jsonError(orderError.message, 500);
  }

  const providerOrderId = `${provider.name}_${orderRow.id}`;
  const { error: providerOrderError } = await admin
    .from("orders")
    .update({ provider_order_id: providerOrderId })
    .eq("id", orderRow.id);

  if (providerOrderError) {
    return jsonError(providerOrderError.message, 500, {
      orderId: orderRow.id,
    });
  }

  const product: CheckoutProduct = {
    id: productRow.id,
    slug: productRow.slug,
    name: productRow.name,
    productType: productRow.product_type,
    amount: productRow.amount,
    currency: productRow.currency,
    durationMonths: productRow.duration_months,
    metadata: productRow.metadata ?? {},
  };

  const order: CheckoutOrder = {
    id: orderRow.id,
    userId: orderRow.user_id,
    productId: orderRow.product_id,
    amount: orderRow.amount,
    currency: orderRow.currency,
    provider: orderRow.provider as PaymentProviderName,
    providerOrderId,
  };

  try {
    const checkout = await provider.createCheckout({
      order,
      product,
      customer: {
        email: user.email,
        name:
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : null,
      },
      successUrl: `${siteUrl}/payment/success?orderId=${order.id}`,
      failUrl: `${siteUrl}/payment/fail?orderId=${order.id}`,
    });

    const { error: checkoutUpdateError } = await admin
      .from("orders")
      .update({
        status: "processing",
        checkout_url: getCheckoutUrl(checkout),
        provider_order_id: checkout.providerOrderId,
        raw_checkout_payload: checkout.rawPayload ?? {},
      })
      .eq("id", order.id);

    if (checkoutUpdateError) {
      return jsonError(checkoutUpdateError.message, 500, {
        orderId: order.id,
      });
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      checkout:
        checkout.mode === "redirect"
          ? {
              mode: checkout.mode,
              checkoutUrl: checkout.checkoutUrl,
            }
          : {
              mode: checkout.mode,
              actionUrl: checkout.actionUrl,
              fields: checkout.fields,
            },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Payment provider failed.";

    return jsonError(message, message === "Not implemented" ? 501 : 500, {
      orderId: order.id,
      provider: provider.name,
    });
  }
}
