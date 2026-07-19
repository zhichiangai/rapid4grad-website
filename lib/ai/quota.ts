import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database-v2.generated";
import type { Json } from "@/types/database";

type V2Client = SupabaseClient<Database>;

export type LabPdfCreditBalance = {
  labId: string;
  limit: number;
  reserved: number;
  used: number;
  remaining: number;
  periodStart: string;
  periodEnd: string;
};

export type LabPdfAuditEligibility = {
  allowed: boolean;
  reason: string | null;
  balance: LabPdfCreditBalance | null;
};

export class LabPdfAuditServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "LabPdfAuditServiceError";
    this.code = code;
    this.status = status;
  }
}

const PUBLIC_ERROR_RULES = [
  {
    code: "active_student_profile_required",
    message: "只有啟用中的學生帳號可以使用 Lab PDF AI 稽核。",
    status: 403,
  },
  {
    code: "active_student_lab_membership_required",
    message: "請先加入一個有效的 Professor Lab。",
    status: 403,
  },
  {
    code: "functional_lab_subscription_required",
    message: "你的 Lab 目前沒有可使用 PDF AI 稽核的有效訂閱。",
    status: 403,
  },
  {
    code: "lab_pdf_audit_limit_reached",
    message: "本期 Lab PDF AI 稽核共享額度已用完。",
    status: 429,
  },
  {
    code: "ready_owned_document_required",
    message: "找不到屬於你的可用 PDF 文件。",
    status: 404,
  },
  {
    code: "audit_idempotency_conflict",
    message: "這次稽核識別碼已用於不同內容，請重新送出。",
    status: 409,
  },
  {
    code: "audit_idempotency_key_required",
    message: "缺少稽核識別碼，請重新送出。",
    status: 400,
  },
  {
    code: "invalid_audit_job_input",
    message: "稽核參數無效。",
    status: 400,
  },
] as const;

function normalizeDatabaseError(error: { message?: string } | null) {
  const rawMessage = error?.message ?? "";
  const matched = PUBLIC_ERROR_RULES.find((rule) => rawMessage.includes(rule.code));

  if (matched) {
    return new LabPdfAuditServiceError(
      matched.code,
      matched.message,
      matched.status,
    );
  }

  return new LabPdfAuditServiceError(
    "lab_pdf_audit_unavailable",
    "目前無法確認 Lab PDF AI 稽核資格，請稍後再試。",
    503,
  );
}

export async function getLabPdfAuditEligibility(
  supabase: V2Client,
): Promise<LabPdfAuditEligibility> {
  const { data, error } = await supabase.rpc("get_my_lab_pdf_credit_balance");

  if (error) {
    const normalized = normalizeDatabaseError(error);
    return { allowed: false, reason: normalized.message, balance: null };
  }

  const credit = data?.[0];
  if (!credit) {
    return {
      allowed: false,
      reason: "目前沒有可用的 Lab PDF AI 稽核額度週期。",
      balance: null,
    };
  }

  const balance: LabPdfCreditBalance = {
    labId: credit.lab_id,
    limit: credit.pdf_audit_limit,
    reserved: credit.pdf_audit_reserved,
    used: credit.pdf_audit_used,
    remaining: credit.pdf_audit_remaining,
    periodStart: credit.period_start,
    periodEnd: credit.period_end,
  };

  if (balance.limit <= 0) {
    return {
      allowed: false,
      reason: "此 Lab 的 PDF AI 稽核額度尚未設定，請聯絡管理者。",
      balance,
    };
  }

  if (balance.remaining <= 0) {
    return {
      allowed: false,
      reason: "本期 Lab PDF AI 稽核共享額度已用完。",
      balance,
    };
  }

  return { allowed: true, reason: null, balance };
}

export async function reserveLabPdfAuditJob(
  supabase: V2Client,
  input: {
    userId: string;
    documentId: string;
    auditType: Database["public"]["Enums"]["ai_audit_type"];
    provider: Database["public"]["Enums"]["ai_audit_provider"];
    model: string;
    inputPrompt: string;
    idempotencyKey: string;
  },
) {
  const { data, error } = await supabase.rpc("reserve_lab_pdf_audit_job", {
    target_user_id: input.userId,
    target_document_id: input.documentId,
    target_audit_type: input.auditType,
    target_provider: input.provider,
    target_model: input.model,
    target_input_prompt: input.inputPrompt,
    target_idempotency_key: input.idempotencyKey,
  });

  if (error) {
    throw normalizeDatabaseError(error);
  }

  const reservation = data?.[0];
  if (!reservation) {
    throw new LabPdfAuditServiceError(
      "reservation_missing",
      "目前無法建立 AI 稽核任務，請稍後再試。",
      503,
    );
  }

  return {
    jobId: reservation.job_id,
    created: reservation.created,
  };
}

export async function settleLabPdfAuditJob(
  supabase: V2Client,
  input: {
    jobId: string;
    summary: string;
    markdown: string;
    riskLevel: Database["public"]["Enums"]["risk_level"];
    issueTags: string[];
    inputTokens: number;
    outputTokens: number;
    costEstimateCents: number;
  },
) {
  const { error } = await supabase.rpc("complete_lab_pdf_audit_job", {
    target_job_id: input.jobId,
    result_summary: input.summary,
    result_markdown: input.markdown,
    result_risk_level: input.riskLevel,
    result_issue_tags: input.issueTags,
    result_token_input: input.inputTokens,
    result_token_output: input.outputTokens,
    result_cost_estimate_cents: input.costEstimateCents,
  });

  if (!error) return;

  const { data: job } = await supabase
    .from("ai_audit_jobs")
    .select("status,credit_state")
    .eq("id", input.jobId)
    .maybeSingle();

  if (job?.status === "completed" && job.credit_state === "settled") return;

  throw new LabPdfAuditServiceError(
    "audit_persistence_failed",
    "AI 稽核結果目前無法安全保存。",
    503,
  );
}

export async function refundLabPdfAuditJob(
  supabase: V2Client,
  input: { jobId: string; code: string; message: string },
) {
  const { error } = await supabase.rpc("fail_lab_pdf_audit_job", {
    target_job_id: input.jobId,
    failure_code: input.code.slice(0, 120),
    failure_message: input.message.slice(0, 500),
  });

  if (!error) return;

  const { data: job } = await supabase
    .from("ai_audit_jobs")
    .select("status,credit_state")
    .eq("id", input.jobId)
    .maybeSingle();

  if (
    (job?.status === "failed" || job?.status === "cancelled") &&
    job.credit_state === "refunded"
  ) {
    return;
  }

  throw new LabPdfAuditServiceError(
    "audit_refund_failed",
    "AI 稽核額度目前無法完成退回。",
    503,
  );
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

  return { inputTokens, outputTokens };
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
