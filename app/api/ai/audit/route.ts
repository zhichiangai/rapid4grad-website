import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  buildAuditSystemPrompt,
  buildAuditUserInstruction,
  isAiAuditType,
  parseAuditResult,
} from "@/lib/ai/audit-prompts";
import {
  getAiAuditProvider,
  isAiAuditProvider,
} from "@/lib/ai/providers";
import {
  checkAiAuditQuota,
  estimateCostCents,
  extractUsageTokens,
  incrementPdfAuditUsage,
} from "@/lib/ai/quota";
import { STUDENT_DOCUMENTS_BUCKET } from "@/lib/documents/validation";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

type AuditRequestBody = {
  documentId?: unknown;
  provider?: unknown;
  auditType?: unknown;
};

type StudentDocumentForAudit = {
  id: string;
  user_id: string;
  lab_id: string | null;
  storage_bucket: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  upload_status: string;
};

type AuditJob = {
  id: string;
  user_id: string;
  document_id: string;
  lab_id: string | null;
};

function jsonError(message: string, status = 400, extra?: Record<string, Json>) {
  return NextResponse.json(
    { success: false, error: message, ...extra },
    { status },
  );
}

async function canAccessDocument(input: {
  supabase: ReturnType<typeof createAdminClient>;
  userId: string;
  document: StudentDocumentForAudit;
}) {
  if (input.document.user_id === input.userId) {
    return true;
  }

  if (!input.document.lab_id) {
    return false;
  }

  const { data: membership, error } = await input.supabase
    .from("lab_memberships")
    .select("id")
    .eq("lab_id", input.document.lab_id)
    .eq("user_id", input.userId)
    .in("role", ["professor", "assistant"])
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(membership);
}

async function downloadPdfAsBase64(input: {
  supabase: ReturnType<typeof createAdminClient>;
  storagePath: string;
}) {
  const { data, error } = await input.supabase.storage
    .from(STUDENT_DOCUMENTS_BUCKET)
    .download(input.storagePath);

  if (error) {
    throw new Error(error.message);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}

async function updateJobStatus(input: {
  supabase: ReturnType<typeof createAdminClient>;
  jobId: string;
  status: "streaming" | "completed" | "failed";
  errorMessage?: string;
}) {
  const { error } = await input.supabase
    .from("ai_audit_jobs")
    .update({
      status: input.status,
      error_message: input.errorMessage ?? null,
      completed_at:
        input.status === "completed" || input.status === "failed"
          ? new Date().toISOString()
          : null,
    })
    .eq("id", input.jobId);

  if (error) {
    throw new Error(error.message);
  }
}

async function persistAuditResult(input: {
  job: AuditJob;
  text: string;
  usage: unknown;
  creditId: string | null;
  providerCost: {
    estimatedInputCostCentsPer1k: number;
    estimatedOutputCostCentsPer1k: number;
  };
}) {
  const supabase = createAdminClient();
  const parsed = parseAuditResult(input.text);
  const { inputTokens, outputTokens } = extractUsageTokens(input.usage);
  const costEstimateCents = estimateCostCents({
    inputTokens,
    outputTokens,
    inputCostPer1k: input.providerCost.estimatedInputCostCentsPer1k,
    outputCostPer1k: input.providerCost.estimatedOutputCostCentsPer1k,
  });

  const { error: resultError } = await supabase.from("ai_audit_results").insert({
    job_id: input.job.id,
    user_id: input.job.user_id,
    summary: parsed.summary,
    result_markdown: input.text,
    risk_level: parsed.riskLevel,
    issue_tags: parsed.issueTags,
    token_input: inputTokens,
    token_output: outputTokens,
    cost_estimate_cents: costEstimateCents,
  });

  if (resultError) {
    throw new Error(resultError.message);
  }

  await updateJobStatus({
    supabase,
    jobId: input.job.id,
    status: "completed",
  });

  if (input.creditId) {
    await incrementPdfAuditUsage(supabase, input.creditId);
  }
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

  if (!user) {
    return jsonError("Login is required before AI audit.", 401);
  }

  let body: AuditRequestBody;

  try {
    body = (await request.json()) as AuditRequestBody;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (
    typeof body.documentId !== "string" ||
    !isAiAuditProvider(body.provider) ||
    !isAiAuditType(body.auditType)
  ) {
    return jsonError("documentId, provider, and auditType are required.", 400);
  }

  const admin = createAdminClient();
  const { data: document, error: documentError } = await admin
    .from("student_documents")
    .select(
      "id,user_id,lab_id,storage_bucket,storage_path,original_filename,mime_type,upload_status",
    )
    .eq("id", body.documentId)
    .maybeSingle<StudentDocumentForAudit>();

  if (documentError) {
    return jsonError(documentError.message, 500);
  }

  if (!document) {
    return jsonError("Document was not found.", 404);
  }

  if (
    document.storage_bucket !== STUDENT_DOCUMENTS_BUCKET ||
    document.mime_type !== "application/pdf" ||
    document.upload_status !== "ready"
  ) {
    return jsonError("Document is not a ready private PDF.", 400);
  }

  try {
    const authorized = await canAccessDocument({
      supabase: admin,
      userId: user.id,
      document,
    });

    if (!authorized) {
      return jsonError("You are not allowed to audit this document.", 403);
    }

    const quota = await checkAiAuditQuota(admin, user.id);

    if (!quota.allowed) {
      return jsonError(quota.reason ?? "AI audit quota is not available.", 403);
    }

    const provider = getAiAuditProvider(body.provider);
    const inputPrompt = buildAuditUserInstruction({
      auditType: body.auditType,
      filename: document.original_filename,
    });

    const { data: job, error: jobError } = await admin
      .from("ai_audit_jobs")
      .insert({
        user_id: document.user_id,
        document_id: document.id,
        lab_id: document.lab_id,
        audit_type: body.auditType,
        provider: body.provider,
        model: provider.model,
        status: "queued",
        input_prompt: inputPrompt,
      })
      .select("id,user_id,document_id,lab_id")
      .single<AuditJob>();

    if (jobError) {
      return jsonError(jobError.message, 500);
    }

    await updateJobStatus({
      supabase: admin,
      jobId: job.id,
      status: "streaming",
    });

    const pdfBase64 = await downloadPdfAsBase64({
      supabase: admin,
      storagePath: document.storage_path,
    });

    const result = streamText({
      model: provider.model,
      system: buildAuditSystemPrompt(),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: inputPrompt,
            },
            {
              type: "file",
              mediaType: "application/pdf",
              data: pdfBase64,
              filename: document.original_filename,
            },
          ],
        },
      ],
      onFinish({ text, usage }) {
        void persistAuditResult({
          job,
          text,
          usage,
          creditId: quota.creditId,
          providerCost: {
            estimatedInputCostCentsPer1k:
              provider.estimatedInputCostCentsPer1k,
            estimatedOutputCostCentsPer1k:
              provider.estimatedOutputCostCentsPer1k,
          },
        }).catch((error: unknown) => {
          console.error("RAPID4GRAD audit persistence failed", error);
        });
      },
      onError({ error }) {
        void updateJobStatus({
          supabase: createAdminClient(),
          jobId: job.id,
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "AI audit stream failed.",
        }).catch((updateError: unknown) => {
          console.error("RAPID4GRAD audit failure persistence failed", updateError);
        });
      },
    });

    return result.toTextStreamResponse({
      headers: {
        "X-RAPID-Audit-Job-Id": job.id,
        "X-RAPID-Audit-Provider": body.provider,
        "X-RAPID-Audit-Model": provider.model,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI audit request failed.";
    return jsonError(message, 500);
  }
}
