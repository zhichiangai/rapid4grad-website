import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSubscriptionProvider } from "@/lib/subscriptions";
import { createV2AdminClient, createV2Client } from "@/lib/supabase/server";
import type {
  ProfessorPlanKey,
  SubscriptionBillingInterval,
  SubscriptionCheckoutOrder,
} from "@/lib/subscriptions";

export const runtime = "nodejs";

type CheckoutBody = {
  labId?: unknown;
  planKey?: unknown;
  billingInterval?: unknown;
  checkoutAttemptId?: unknown;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function isPlanKey(value: unknown): value is ProfessorPlanKey {
  return (
    value === "professor_lab_standard" ||
    value === "professor_lab_plus"
  );
}

function isBillingInterval(
  value: unknown,
): value is SubscriptionBillingInterval {
  return value === "month" || value === "year";
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function mapCheckoutError(message: string) {
  if (message.includes("price_not_configured")) {
    return "方案價格尚未公告，目前無法開始正式付款。";
  }
  if (message.includes("already_active")) {
    return "這個 Lab 已經使用相同方案與週期。";
  }
  if (message.includes("downgrade_not_supported")) {
    return "Plus 降級需由客服在目前週期結束前協助處理。";
  }
  if (message.includes("provider_plan_change_requires_manual_support")) {
    return "綠界不支援安全的自動換方案；請聯絡客服變更方案或付款週期，避免重複扣款。";
  }
  if (message.includes("active_lab_owner_required")) {
    return "只有 Lab owner 可以管理這個訂閱。";
  }
  return "目前無法建立教授訂閱付款，請稍後再試。";
}

export async function POST(request: NextRequest) {
  const supabase = await createV2Client();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return jsonError("請先登入教授帳號。", 401);
  }

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return jsonError("請求格式不正確。", 400);
  }

  if (
    !isUuid(body.labId) ||
    !isPlanKey(body.planKey) ||
    !isBillingInterval(body.billingInterval)
  ) {
    return jsonError("Lab、方案或付款週期不正確。", 400);
  }

  const checkoutAttemptId =
    typeof body.checkoutAttemptId === "string" &&
    body.checkoutAttemptId.length >= 16 &&
    body.checkoutAttemptId.length <= 120
      ? body.checkoutAttemptId
      : randomUUID();
  const admin = createV2AdminClient();
  const { data, error } = await admin.rpc(
    "create_professor_subscription_checkout_order",
    {
      target_payer_user_id: user.id,
      target_lab_id: body.labId,
      target_plan_key: body.planKey,
      target_billing_interval: body.billingInterval,
      target_idempotency_key: `professor-subscription:${checkoutAttemptId}`,
    },
  );

  if (error) {
    console.error("Professor subscription order creation failed", {
      code: error.code,
    });
    const message = mapCheckoutError(error.message);
    return jsonError(message, message.includes("價格") ? 503 : 409);
  }

  const result = data as {
    orderId: string;
    subscriptionId: string;
    providerOrderId: string;
    amount: number;
    currency: string;
    productName: string;
    planKey: ProfessorPlanKey;
    billingInterval: SubscriptionBillingInterval;
    isUpgrade: boolean;
    requiresProviderCancellation: boolean;
    previousProviderSubscriptionId: string | null;
  };

  try {
    const provider = getSubscriptionProvider();
    const checkout = await provider.createCheckout({
      order: {
        id: result.orderId,
        subscriptionId: result.subscriptionId,
        providerOrderId: result.providerOrderId,
        amount: result.amount,
        currency: result.currency,
        productName: result.productName,
        planKey: result.planKey,
        billingInterval: result.billingInterval,
      } satisfies SubscriptionCheckoutOrder,
      customer: {
        email: user.email,
        name:
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : null,
      },
      siteUrl: request.nextUrl.origin,
    });

    if (result.isUpgrade) {
      if (!result.previousProviderSubscriptionId) {
        return jsonError("升級狀態不完整，請稍後再試。", 409);
      }

      if (result.requiresProviderCancellation) {
        await provider.cancelSubscription(
          result.previousProviderSubscriptionId,
        );
      }

      const { error: prepareError } = await admin.rpc(
        "prepare_professor_subscription_upgrade",
        {
          target_payer_user_id: user.id,
          target_subscription_id: result.subscriptionId,
          target_order_id: result.orderId,
          target_previous_provider_subscription_id:
            result.previousProviderSubscriptionId,
        },
      );
      if (prepareError) {
        console.error("Professor subscription upgrade preparation failed", {
          code: prepareError.code,
        });
        return jsonError(
          "舊方案已停止續扣，但升級狀態尚未完成同步；請重新按一次升級。",
          503,
        );
      }
    }

    const { error: updateError } = await admin
      .from("orders")
      .update({
        status: "processing",
        raw_checkout_payload: {
          mode: checkout.mode,
          actionUrl: checkout.actionUrl,
          subscriptionUpgrade: result.isUpgrade,
          previousProviderSubscriptionId:
            result.previousProviderSubscriptionId,
          providerScheduleCanceled:
            result.isUpgrade &&
            (result.requiresProviderCancellation ||
              Boolean(result.previousProviderSubscriptionId)),
        },
      })
      .eq("id", result.orderId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Professor subscription order update failed", {
        code: updateError.code,
      });
      return jsonError("付款流程暫時無法啟動。", 503);
    }

    return NextResponse.json({ success: true, checkout });
  } catch (providerError) {
    console.error("Professor subscription provider failed", {
      name:
        providerError instanceof Error
          ? providerError.name
          : "UnknownProviderError",
    });
    return jsonError("綠界訂閱服務尚未完成設定。", 503);
  }
}
