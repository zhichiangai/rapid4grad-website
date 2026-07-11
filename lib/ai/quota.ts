import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/types/database";

type ActiveCredit = {
  id: string;
  pdf_audit_limit: number;
  pdf_audit_used: number;
  monthly_credit_limit: number;
  credits_used: number;
  period_start: string;
  period_end: string;
};

type ActiveSubscription = {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
};

export type AiAuditQuotaCheck = {
  allowed: boolean;
  reason: string | null;
  subscriptionId: string | null;
  creditId: string | null;
  remainingPdfAudits: number;
};

function isActivePeriod(start: string, end: string) {
  const now = Date.now();
  return new Date(start).getTime() <= now && now < new Date(end).getTime();
}

export async function checkAiAuditQuota(
  supabase: SupabaseClient,
  userId: string,
): Promise<AiAuditQuotaCheck> {
  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("id,status,current_period_start,current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle<ActiveSubscription>();

  if (subscriptionError) {
    throw new Error(subscriptionError.message);
  }

  if (
    !subscription ||
    !isActivePeriod(subscription.current_period_start, subscription.current_period_end)
  ) {
    return {
      allowed: false,
      reason: "需要有效的 Phase 2 AI audit 訂閱。",
      subscriptionId: null,
      creditId: null,
      remainingPdfAudits: 0,
    };
  }

  const { data: credit, error: creditError } = await supabase
    .from("ai_usage_credits")
    .select(
      "id,pdf_audit_limit,pdf_audit_used,monthly_credit_limit,credits_used,period_start,period_end",
    )
    .eq("user_id", userId)
    .eq("subscription_id", subscription.id)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle<ActiveCredit>();

  if (creditError) {
    throw new Error(creditError.message);
  }

  if (!credit || !isActivePeriod(credit.period_start, credit.period_end)) {
    return {
      allowed: false,
      reason: "目前沒有有效的 AI audit 額度週期。",
      subscriptionId: subscription.id,
      creditId: null,
      remainingPdfAudits: 0,
    };
  }

  const remainingPdfAudits = Math.max(
    0,
    credit.pdf_audit_limit - credit.pdf_audit_used,
  );

  if (remainingPdfAudits <= 0) {
    return {
      allowed: false,
      reason: "本期 PDF audit 額度已用完。",
      subscriptionId: subscription.id,
      creditId: credit.id,
      remainingPdfAudits,
    };
  }

  return {
    allowed: true,
    reason: null,
    subscriptionId: subscription.id,
    creditId: credit.id,
    remainingPdfAudits,
  };
}

export async function reservePdfAuditUsage(
  supabase: SupabaseClient,
  creditId: string,
  jobId: string,
) {
  const { error } = await supabase.rpc("reserve_pdf_audit_credit", {
    target_credit_id: creditId,
    target_job_id: jobId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function refundPdfAuditUsage(
  supabase: SupabaseClient,
  jobId: string,
  message: string,
) {
  const { error } = await supabase.rpc("fail_ai_audit_job", {
    target_job_id: jobId,
    failure_message: message.slice(0, 500),
  });

  if (error) {
    throw new Error(error.message);
  }
}

function getTokenCount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return 0;
}

export function extractUsageTokens(usage: unknown) {
  const record =
    typeof usage === "object" && usage !== null
      ? (usage as Record<string, Json | undefined>)
      : {};

  const inputTokens = getTokenCount(
    record.inputTokens ?? record.promptTokens ?? record.totalInputTokens,
  );
  const outputTokens = getTokenCount(
    record.outputTokens ?? record.completionTokens ?? record.totalOutputTokens,
  );

  return {
    inputTokens,
    outputTokens,
  };
}

export function estimateCostCents({
  inputTokens,
  outputTokens,
  inputCostPer1k,
  outputCostPer1k,
}: {
  inputTokens: number;
  outputTokens: number;
  inputCostPer1k: number;
  outputCostPer1k: number;
}) {
  return Math.ceil(
    (inputTokens / 1000) * inputCostPer1k +
      (outputTokens / 1000) * outputCostPer1k,
  );
}
