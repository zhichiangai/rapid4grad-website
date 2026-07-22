import { NextRequest, NextResponse } from "next/server";
import { getSubscriptionProvider } from "@/lib/subscriptions";
import { createV2AdminClient, createV2Client } from "@/lib/supabase/server";

type CancelBody = { subscriptionId?: unknown };

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  const supabase = await createV2Client();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("請先登入教授帳號。", 401);

  let body: CancelBody;
  try {
    body = (await request.json()) as CancelBody;
  } catch {
    return jsonError("請求格式不正確。", 400);
  }
  if (typeof body.subscriptionId !== "string") {
    return jsonError("缺少訂閱識別碼。", 400);
  }

  const admin = createV2AdminClient();
  const { data: subscription, error } = await admin
    .from("subscriptions")
    .select("id,payer_user_id,provider,provider_subscription_id,status")
    .eq("id", body.subscriptionId)
    .eq("payer_user_id", user.id)
    .maybeSingle();

  if (error || !subscription) {
    return jsonError("找不到可管理的訂閱。", 404);
  }

  try {
    if (subscription.provider === "ecpay") {
      if (!subscription.provider_subscription_id) {
        return jsonError("綠界訂閱尚未完成付款同步。", 409);
      }
      await getSubscriptionProvider().cancelSubscription(
        subscription.provider_subscription_id,
      );
    }

    const { data, error: cancelError } = await admin.rpc(
      "mark_professor_subscription_cancel_at_period_end",
      {
        target_payer_user_id: user.id,
        target_subscription_id: subscription.id,
      },
    );
    if (cancelError) throw cancelError;

    return NextResponse.json({ success: true, cancellation: data });
  } catch (cancelError) {
    console.error("Professor subscription cancellation failed", {
      name:
        cancelError instanceof Error ? cancelError.name : "UnknownCancelError",
    });
    return jsonError("目前無法取消訂閱，請稍後再試。", 502);
  }
}
