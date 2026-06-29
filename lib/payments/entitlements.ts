import type { SupabaseClient } from "@supabase/supabase-js";

type GrantCourseAccessInput = {
  userId: string;
  productId: string;
  orderId: string;
  paymentId: string;
  startsAt: string;
  endsAt: string;
};

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
