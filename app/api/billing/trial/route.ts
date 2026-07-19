import { NextRequest, NextResponse } from "next/server";
import { createV2AdminClient, createV2Client } from "@/lib/supabase/server";
import type {
  ProfessorPlanKey,
  SubscriptionBillingInterval,
} from "@/lib/subscriptions";

type TrialBody = {
  labId?: unknown;
  planKey?: unknown;
  billingInterval?: unknown;
};

function isPlanKey(value: unknown): value is ProfessorPlanKey {
  return value === "professor_lab_standard" || value === "professor_lab_plus";
}

function isInterval(value: unknown): value is SubscriptionBillingInterval {
  return value === "month" || value === "year";
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  const supabase = await createV2Client();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError("請先登入教授帳號。", 401);

  let body: TrialBody;
  try {
    body = (await request.json()) as TrialBody;
  } catch {
    return jsonError("請求格式不正確。", 400);
  }

  if (
    typeof body.labId !== "string" ||
    !isPlanKey(body.planKey) ||
    !isInterval(body.billingInterval)
  ) {
    return jsonError("Lab、方案或預計付款週期不正確。", 400);
  }

  const admin = createV2AdminClient();
  const { data, error } = await admin.rpc("start_professor_subscription_trial", {
    target_payer_user_id: user.id,
    target_lab_id: body.labId,
    target_plan_key: body.planKey,
    target_billing_interval: body.billingInterval,
  });

  if (error) {
    console.error("Professor trial creation failed", { code: error.code });
    if (error.message.includes("already_claimed")) {
      return jsonError("這個教授帳號已使用過免費試用。", 409);
    }
    if (error.message.includes("current_lab_subscription_exists")) {
      return jsonError("這個 Lab 已有目前訂閱或試用。", 409);
    }
    if (error.message.includes("active_lab_owner_required")) {
      return jsonError("只有 Lab owner 可以啟用試用。", 403);
    }
    return jsonError("目前無法啟用免費試用，請稍後再試。", 503);
  }

  return NextResponse.json({ success: true, trial: data });
}
