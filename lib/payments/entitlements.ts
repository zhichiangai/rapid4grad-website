import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json, ProductType } from "@/types/database";

type GrantCourseAccessInput = {
  userId: string;
  productId: string;
  orderId: string;
  paymentId: string;
  startsAt: string;
  endsAt: string;
};

type OrderForEntitlement = {
  id: string;
  user_id: string;
};

type ProductForEntitlement = {
  id: string;
  product_type: ProductType;
  duration_months: number | null;
  metadata: Json;
};

type PaymentForEntitlement = {
  id: string;
  paid_at: string | null;
};

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

export async function grantCourseEntitlement(
  supabase: SupabaseClient,
  input: GrantCourseAccessInput,
) {
  const { error: entitlementError } = await supabase
    .from("entitlements")
    .insert({
      user_id: input.userId,
      product_id: input.productId,
      type: "course_access",
      status: "active",
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      source_order_id: input.orderId,
      source_payment_id: input.paymentId,
    });

  if (entitlementError) {
    throw new Error(entitlementError.message);
  }
}

export async function grantEntitlementsForOrder(
  supabase: SupabaseClient,
  {
    order,
    product,
    payment,
  }: {
    order: OrderForEntitlement;
    product: ProductForEntitlement;
    payment: PaymentForEntitlement;
  },
) {
  const startsAt = payment.paid_at ?? new Date().toISOString();
  const startsAtDate = new Date(startsAt);
  const durationMonths = product.duration_months ?? 6;
  const endsAt =
    product.product_type === "subscription"
      ? null
      : addMonths(startsAtDate, durationMonths).toISOString();

  if (product.product_type === "course" || product.product_type === "bundle") {
    await grantCourseEntitlement(supabase, {
      userId: order.user_id,
      productId: product.id,
      orderId: order.id,
      paymentId: payment.id,
      startsAt,
      endsAt: endsAt ?? addMonths(startsAtDate, durationMonths).toISOString(),
    });
  }
}
