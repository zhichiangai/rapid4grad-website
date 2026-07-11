import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  assertValidDocumentId,
  buildStudentDocumentStoragePath,
  isUploadDocumentType,
  MAX_PDF_SIZE_BYTES,
  STUDENT_DOCUMENTS_BUCKET,
} from "@/lib/documents/validation";

export const runtime = "nodejs";

type CompleteUploadRequestBody = {
  documentId?: unknown;
  documentType?: unknown;
  objectPath?: unknown;
};

const BODY_LIMIT_BYTES = 4096;
const PDF_MAGIC = Buffer.from("%PDF-", "ascii");

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function parseBody(
  request: NextRequest,
): Promise<CompleteUploadRequestBody | null> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > BODY_LIMIT_BYTES) return null;

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > BODY_LIMIT_BYTES) return null;

  try {
    return JSON.parse(raw) as CompleteUploadRequestBody;
  } catch {
    return null;
  }
}

async function deleteInvalidObject(objectPath: string) {
  const { error } = await createAdminClient().storage
    .from(STUDENT_DOCUMENTS_BUCKET)
    .remove([objectPath]);

  if (error) {
    console.error("[documents-complete] Invalid object cleanup failed");
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("請先登入後再完成上傳。", 401);
  }

  const body = await parseBody(request);
  if (
    !body ||
    typeof body.documentId !== "string" ||
    typeof body.objectPath !== "string"
  ) {
    return jsonError("無效的上傳完成請求。", 400);
  }

  if (
    !assertValidDocumentId(body.documentId) ||
    !isUploadDocumentType(body.documentType)
  ) {
    return jsonError("無效的文件參數。", 400);
  }

  const expectedPrefix = `${user.id}/${body.documentId}/`;
  const pathParts = body.objectPath.split("/");
  const storedFilename = pathParts[2] ?? "";
  if (
    !body.objectPath.startsWith(expectedPrefix) ||
    pathParts.length !== 3 ||
    !storedFilename.endsWith(".pdf") ||
    storedFilename.length > 180
  ) {
    return jsonError("文件路徑與登入帳號不符。", 403);
  }

  const admin = createAdminClient();

  try {
    const { data: fileBlob, error: downloadError } = await admin.storage
      .from(STUDENT_DOCUMENTS_BUCKET)
      .download(body.objectPath);

    if (downloadError || !fileBlob) {
      console.error("[documents-complete] Private object download failed", {
        code: downloadError?.statusCode,
      });
      return jsonError("找不到已上傳的 PDF，請重新上傳。", 404);
    }

    const bytes = Buffer.from(await fileBlob.arrayBuffer());
    const actualMimeType = fileBlob.type.toLowerCase();
    const sizeValid = bytes.length > PDF_MAGIC.length && bytes.length <= MAX_PDF_SIZE_BYTES;
    const mimeValid = actualMimeType === "application/pdf";
    const magicValid = bytes.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC);

    if (!sizeValid || !mimeValid || !magicValid) {
      console.error("[documents-complete] Uploaded object failed PDF validation", {
        sizeValid,
        mimeValid,
        magicValid,
      });
      await deleteInvalidObject(body.objectPath);
      return jsonError("上傳的檔案不是有效的 PDF，已安全移除。", 400);
    }

    const { data: document, error } = await admin
      .from("student_documents")
      .insert({
        id: body.documentId,
        user_id: user.id,
        lab_id: null,
        storage_bucket: STUDENT_DOCUMENTS_BUCKET,
        storage_path: body.objectPath,
        original_filename: storedFilename,
        mime_type: actualMimeType,
        file_size_bytes: bytes.length,
        document_type: body.documentType,
        upload_status: "ready",
      })
      .select(
        "id,storage_bucket,storage_path,original_filename,mime_type,file_size_bytes,document_type,upload_status,created_at",
      )
      .single();

    if (error) {
      console.error("[documents-complete] Metadata insert failed", {
        code: error.code,
      });
      return jsonError("目前無法完成文件登記，請稍後再試。", 500);
    }

    return NextResponse.json({
      success: true,
      document,
      storagePath: buildStudentDocumentStoragePath(body.objectPath),
    });
  } catch (error) {
    console.error("[documents-complete] Unexpected completion failure", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonError("目前無法完成文件上傳，請稍後再試。", 500);
  }
}
