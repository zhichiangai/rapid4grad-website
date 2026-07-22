import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import {
  buildAuditSystemPrompt,
  buildAuditUserInstruction,
  isAiAuditType,
  parseAuditResult,
} from "@/lib/ai/audit-prompts";
import { getAiAuditProvider, isAiAuditProvider } from "@/lib/ai/providers";
import {
  estimateCostCents,
  extractUsageTokens,
  LabPdfAuditServiceError,
  refundLabPdfAuditJob,
  reserveLabPdfAuditJob,
  settleLabPdfAuditJob,
} from "@/lib/ai/quota";
import {
  assertValidDocumentId,
  MAX_PDF_SIZE_BYTES,
  STUDENT_DOCUMENTS_BUCKET,
} from "@/lib/documents/validation";
import { createV2AdminClient, createV2Client } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const BODY_LIMIT_BYTES = 4096;
const PDF_MAGIC = Buffer.from("%PDF-", "ascii");

type AuditRequestBody = {
  documentId?: unknown;
  provider?: unknown;
  auditType?: unknown;
  idempotencyKey?: unknown;
};

type StreamOutcome =
  | { kind: "finished"; text: string; usage: unknown; finishReason: string }
  | { kind: "failed" }
  | { kind: "aborted" };

function jsonError(
  message: string,
  status = 400,
  extra?: Record<string, string | boolean>,
) {
  return NextResponse.json(
    { success: false, error: message, ...(extra ?? {}) },
    { status },
  );
}

async function parseBody(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > BODY_LIMIT_BYTES) return null;

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > BODY_LIMIT_BYTES) return null;

  try {
    return JSON.parse(raw) as AuditRequestBody;
  } catch {
    return null;
  }
}

async function downloadOwnedPdfAsBase64(input: {
  storagePath: string;
  expectedSize: number;
}) {
  const admin = createV2AdminClient();
  const { data, error } = await admin.storage
    .from(STUDENT_DOCUMENTS_BUCKET)
    .download(input.storagePath);

  if (error || !data) {
    throw new LabPdfAuditServiceError(
      "pdf_download_failed",
      "目前無法讀取 private PDF。",
      503,
    );
  }

  const bytes = Buffer.from(await data.arrayBuffer());
  if (
    bytes.length !== input.expectedSize ||
    bytes.length <= PDF_MAGIC.length ||
    bytes.length > MAX_PDF_SIZE_BYTES ||
    data.type.toLowerCase() !== "application/pdf" ||
    !bytes.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)
  ) {
    throw new LabPdfAuditServiceError(
      "pdf_integrity_check_failed",
      "PDF 完整性驗證失敗，請重新上傳。",
      400,
    );
  }

  return bytes.toString("base64");
}

async function persistCompletedAudit(input: {
  jobId: string;
  text: string;
  usage: unknown;
  inputCostPer1k: number;
  outputCostPer1k: number;
}) {
  const parsed = parseAuditResult(input.text);
  const { inputTokens, outputTokens } = extractUsageTokens(input.usage);
  const costEstimateCents = estimateCostCents({
    inputTokens,
    outputTokens,
    inputCostPer1k: input.inputCostPer1k,
    outputCostPer1k: input.outputCostPer1k,
  });

  await settleLabPdfAuditJob(createV2AdminClient(), {
    jobId: input.jobId,
    summary: parsed.summary,
    markdown: input.text,
    riskLevel: parsed.riskLevel,
    issueTags: parsed.issueTags,
    inputTokens,
    outputTokens,
    costEstimateCents,
  });
}

async function refundReservedAudit(
  jobId: string,
  code: string,
  message: string,
) {
  try {
    await refundLabPdfAuditJob(createV2AdminClient(), {
      jobId,
      code,
      message,
    });
  } catch (error) {
    console.error("[ai-audit] Shared credit refund failed", {
      jobId,
      name: error instanceof Error ? error.name : "UnknownError",
    });
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createV2Client();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("請先登入學生帳號後再執行 AI 稽核。", 401);
  }

  const body = await parseBody(request);
  if (
    !body ||
    typeof body.documentId !== "string" ||
    !assertValidDocumentId(body.documentId) ||
    !isAiAuditProvider(body.provider) ||
    !isAiAuditType(body.auditType) ||
    typeof body.idempotencyKey !== "string" ||
    !assertValidDocumentId(body.idempotencyKey)
  ) {
    return jsonError("無效的 AI 稽核請求。", 400);
  }

  const admin = createV2AdminClient();
  const { data: document, error: documentError } = await admin
    .from("student_documents")
    .select(
      "id,user_id,storage_bucket,storage_path,original_filename,mime_type,file_size_bytes,upload_status",
    )
    .eq("id", body.documentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (documentError) {
    console.error("[ai-audit] Document lookup failed", {
      code: documentError.code,
    });
    return jsonError("目前無法確認 PDF 文件，請稍後再試。", 503);
  }

  if (!document) {
    return jsonError("找不到屬於你的 PDF 文件。", 404);
  }

  if (
    document.storage_bucket !== STUDENT_DOCUMENTS_BUCKET ||
    document.mime_type !== "application/pdf" ||
    document.upload_status !== "ready"
  ) {
    return jsonError("這份文件尚未通過 private PDF 驗證。", 400);
  }

  const provider = getAiAuditProvider(body.provider);
  const inputPrompt = buildAuditUserInstruction({
    auditType: body.auditType,
    filename: document.original_filename,
  });

  let jobId: string | null = null;

  try {
    const reservation = await reserveLabPdfAuditJob(admin, {
      userId: user.id,
      documentId: document.id,
      auditType: body.auditType,
      provider: body.provider,
      model: provider.model,
      inputPrompt,
      idempotencyKey: body.idempotencyKey,
    });
    jobId = reservation.jobId;

    if (!reservation.created) {
      const { data: existingJob } = await admin
        .from("ai_audit_jobs")
        .select("status")
        .eq("id", reservation.jobId)
        .eq("user_id", user.id)
        .maybeSingle();

      return jsonError(
        existingJob?.status === "completed"
          ? "這次稽核已完成，請到稽核歷史查看。"
          : "這次稽核請求已處理，請勿重複送出。",
        409,
        {
          jobId: reservation.jobId,
          jobStatus: existingJob?.status ?? "unknown",
        },
      );
    }

    const pdfBase64 = await downloadOwnedPdfAsBase64({
      storagePath: document.storage_path,
      expectedSize: document.file_size_bytes,
    });

    const modelAbortController = new AbortController();
    let streamOutcomeResolved = false;
    let resolveStreamOutcome: (outcome: StreamOutcome) => void = () => undefined;
    const streamOutcome = new Promise<StreamOutcome>((resolve) => {
      resolveStreamOutcome = resolve;
    });
    const resolveOnce = (outcome: StreamOutcome) => {
      if (streamOutcomeResolved) return;
      streamOutcomeResolved = true;
      resolveStreamOutcome(outcome);
    };
    const abortFromRequest = () => modelAbortController.abort("client_disconnected");
    request.signal.addEventListener("abort", abortFromRequest, { once: true });

    const result = streamText({
      model: provider.model,
      system: buildAuditSystemPrompt(),
      abortSignal: modelAbortController.signal,
      timeout: { totalMs: 110_000, chunkMs: 30_000 },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: inputPrompt },
            {
              type: "file",
              mediaType: "application/pdf",
              data: pdfBase64,
              filename: document.original_filename,
            },
          ],
        },
      ],
      onFinish({ text, usage, finishReason }) {
        resolveOnce({ kind: "finished", text, usage, finishReason });
      },
      onError({ error }) {
        console.error("[ai-audit] Provider stream failed", {
          jobId,
          name: error instanceof Error ? error.name : "UnknownError",
        });
        resolveOnce({ kind: "failed" });
      },
      onAbort() {
        resolveOnce({ kind: "aborted" });
      },
    });

    const encoder = new TextEncoder();
    const responseStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const textDelta of result.textStream) {
            controller.enqueue(encoder.encode(textDelta));
          }

          const outcome = await streamOutcome;
          if (
            outcome.kind === "aborted" ||
            modelAbortController.signal.aborted
          ) {
            await refundReservedAudit(
              reservation.jobId,
              "user_aborted",
              "AI audit was cancelled before completion.",
            );
            controller.error(new Error("AI audit cancelled."));
            return;
          }

          if (
            outcome.kind === "failed" ||
            outcome.finishReason === "error" ||
            !outcome.text.trim()
          ) {
            await refundReservedAudit(
              reservation.jobId,
              "provider_stream_failed",
              "AI provider did not complete a valid audit result.",
            );
            controller.error(new Error("AI audit stream failed."));
            return;
          }

          try {
            await persistCompletedAudit({
              jobId: reservation.jobId,
              text: outcome.text,
              usage: outcome.usage,
              inputCostPer1k: provider.estimatedInputCostCentsPer1k,
              outputCostPer1k: provider.estimatedOutputCostCentsPer1k,
            });
          } catch (error) {
            console.error("[ai-audit] Result persistence failed", {
              jobId: reservation.jobId,
              name: error instanceof Error ? error.name : "UnknownError",
            });
            await refundReservedAudit(
              reservation.jobId,
              "persistence_failed",
              "AI audit result persistence failed.",
            );
            controller.error(new Error("AI audit persistence failed."));
            return;
          }

          controller.close();
        } catch (error) {
          const aborted = modelAbortController.signal.aborted;
          try {
            await refundReservedAudit(
              reservation.jobId,
              aborted ? "user_aborted" : "provider_stream_failed",
              aborted
                ? "AI audit was cancelled before completion."
                : "AI audit stream failed before completion.",
            );
          } catch {
            // The server log emitted by refundReservedAudit is sufficient here.
          }
          controller.error(
            error instanceof Error ? error : new Error("AI audit failed."),
          );
        } finally {
          request.signal.removeEventListener("abort", abortFromRequest);
        }
      },
      async cancel() {
        modelAbortController.abort("client_cancelled");
        try {
          await refundReservedAudit(
            reservation.jobId,
            "user_aborted",
            "AI audit was cancelled by the user.",
          );
        } catch {
          // The server log emitted by refundReservedAudit is sufficient here.
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-RAPID-Audit-Job-Id": reservation.jobId,
        "X-RAPID-Audit-Provider": body.provider,
        "X-RAPID-Audit-Model": provider.model,
      },
    });
  } catch (error) {
    if (jobId) {
      try {
        await refundReservedAudit(
          jobId,
          "setup_failed",
          "AI audit setup failed before streaming.",
        );
      } catch {
        // The server log emitted by refundReservedAudit is sufficient here.
      }
    }

    console.error("[ai-audit] Request setup failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });

    if (error instanceof LabPdfAuditServiceError) {
      return jsonError(error.message, error.status, { code: error.code });
    }

    return jsonError("目前無法啟動 AI 稽核，請稍後再試。", 503);
  }
}
