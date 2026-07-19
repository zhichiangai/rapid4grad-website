import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getLabPdfAuditEligibility } from "@/lib/ai/quota";
import {
  buildStudentDocumentObjectPath,
  buildStudentDocumentStoragePath,
  isUploadDocumentType,
  STUDENT_DOCUMENTS_BUCKET,
  validatePdfUpload,
} from "@/lib/documents/validation";
import { createV2AdminClient, createV2Client } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BODY_LIMIT_BYTES = 4096;

type UploadUrlRequestBody = {
  filename?: unknown;
  mimeType?: unknown;
  sizeBytes?: unknown;
  documentType?: unknown;
};

function jsonError(message: string, status = 400, details?: string[]) {
  return NextResponse.json(
    { success: false, error: message, ...(details ? { details } : {}) },
    { status },
  );
}

async function parseBody(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > BODY_LIMIT_BYTES) return null;

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > BODY_LIMIT_BYTES) return null;

  try {
    return JSON.parse(raw) as UploadUrlRequestBody;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createV2Client();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("請先登入學生帳號後再上傳 PDF。", 401);
  }

  const body = await parseBody(request);
  if (
    !body ||
    typeof body.filename !== "string" ||
    typeof body.mimeType !== "string" ||
    typeof body.sizeBytes !== "number" ||
    !isUploadDocumentType(body.documentType)
  ) {
    return jsonError("無效的 PDF 上傳請求。", 400);
  }

  const validation = validatePdfUpload({
    filename: body.filename,
    mimeType: body.mimeType,
    sizeBytes: body.sizeBytes,
  });

  if (!validation.valid) {
    return jsonError("PDF 檔案不符合上傳規則。", 400, validation.errors);
  }

  const eligibility = await getLabPdfAuditEligibility(supabase);
  if (!eligibility.allowed) {
    return jsonError(
      eligibility.reason ?? "目前沒有 Lab PDF AI 稽核資格。",
      eligibility.balance?.remaining === 0 ? 429 : 403,
    );
  }

  const admin = createV2AdminClient();
  const documentId = randomUUID();
  const objectPath = buildStudentDocumentObjectPath({
    userId: user.id,
    documentId,
    filename: body.filename,
  });

  const { data, error } = await admin.storage
    .from(STUDENT_DOCUMENTS_BUCKET)
    .createSignedUploadUrl(objectPath);

  if (error) {
    console.error("[documents-upload-url] Signed upload creation failed", {
      code: error.name,
    });
    return jsonError("目前無法準備 PDF 上傳，請稍後再試。", 503);
  }

  return NextResponse.json({
    success: true,
    bucket: STUDENT_DOCUMENTS_BUCKET,
    documentId,
    objectPath,
    storagePath: buildStudentDocumentStoragePath(objectPath),
    token: data.token,
  });
}
