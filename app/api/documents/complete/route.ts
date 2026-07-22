import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getLabPdfAuditEligibility } from "@/lib/ai/quota";
import {
  assertValidDocumentId,
  buildStudentDocumentStoragePath,
  isUploadDocumentType,
  MAX_PDF_SIZE_BYTES,
  STUDENT_DOCUMENTS_BUCKET,
} from "@/lib/documents/validation";
import { createV2AdminClient, createV2Client } from "@/lib/supabase/server";

export const runtime = "nodejs";

type CompleteUploadRequestBody = {
  documentId?: unknown;
  documentType?: unknown;
  objectPath?: unknown;
};

const BODY_LIMIT_BYTES = 4096;
const PDF_MAGIC = Buffer.from("%PDF-", "ascii");
const DOCUMENT_SELECT =
  "id,storage_bucket,storage_path,original_filename,mime_type,file_size_bytes,document_type,upload_status,sha256_hex,created_at";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function parseBody(request: NextRequest) {
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

function getStorageMetadataValue(
  metadata: Record<string, unknown> | null | undefined,
  keys: string[],
) {
  for (const key of keys) {
    if (metadata?.[key] !== undefined && metadata[key] !== null) {
      return metadata[key];
    }
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  const supabase = await createV2Client();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("請先登入學生帳號後再完成上傳。", 401);
  }

  const body = await parseBody(request);
  if (
    !body ||
    typeof body.documentId !== "string" ||
    typeof body.objectPath !== "string" ||
    !assertValidDocumentId(body.documentId) ||
    !isUploadDocumentType(body.documentType)
  ) {
    return jsonError("無效的上傳完成請求。", 400);
  }

  const expectedPrefix = `${user.id}/${body.documentId}/`;
  const pathParts = body.objectPath.split("/");
  const storedFilename = pathParts[2] ?? "";
  if (
    !body.objectPath.startsWith(expectedPrefix) ||
    pathParts.length !== 3 ||
    !storedFilename.toLowerCase().endsWith(".pdf") ||
    storedFilename.length > 180
  ) {
    return jsonError("文件路徑與登入帳號不符。", 403);
  }

  const admin = createV2AdminClient();
  const deleteObject = async () => {
    const { error } = await admin.storage
      .from(STUDENT_DOCUMENTS_BUCKET)
      .remove([body.objectPath as string]);
    if (error) {
      console.error("[documents-complete] Object cleanup failed", {
        code: error.name,
      });
    }
  };

  const { data: existingDocument, error: existingError } = await admin
    .from("student_documents")
    .select(DOCUMENT_SELECT)
    .eq("id", body.documentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    console.error("[documents-complete] Existing metadata lookup failed", {
      code: existingError.code,
    });
    return jsonError("目前無法確認文件狀態，請稍後再試。", 503);
  }

  if (existingDocument) {
    if (existingDocument.storage_path !== body.objectPath) {
      return jsonError("文件識別碼已用於其他檔案。", 409);
    }

    return NextResponse.json({
      success: true,
      document: existingDocument,
      storagePath: buildStudentDocumentStoragePath(body.objectPath),
      replayed: true,
    });
  }

  const eligibility = await getLabPdfAuditEligibility(supabase);
  if (!eligibility.allowed) {
    await deleteObject();
    return jsonError(
      eligibility.reason ?? "目前沒有 Lab PDF AI 稽核資格。",
      eligibility.balance?.remaining === 0 ? 429 : 403,
    );
  }

  try {
    const folderPath = `${user.id}/${body.documentId}`;
    const { data: objectRows, error: listError } = await admin.storage
      .from(STUDENT_DOCUMENTS_BUCKET)
      .list(folderPath, { limit: 10, search: storedFilename });
    const storageObject = objectRows?.find((item) => item.name === storedFilename);

    if (listError || !storageObject) {
      console.error("[documents-complete] Storage metadata lookup failed", {
        code: listError?.name,
      });
      await deleteObject();
      return jsonError("找不到已上傳的 PDF，請重新上傳。", 404);
    }

    const metadata = storageObject.metadata as Record<string, unknown> | null;
    const metadataMime = String(
      getStorageMetadataValue(metadata, ["mimetype", "contentType"]) ?? "",
    ).toLowerCase();
    const metadataSize = Number(
      getStorageMetadataValue(metadata, ["size", "contentLength"]) ?? 0,
    );

    const { data: fileBlob, error: downloadError } = await admin.storage
      .from(STUDENT_DOCUMENTS_BUCKET)
      .download(body.objectPath);

    if (downloadError || !fileBlob) {
      console.error("[documents-complete] Private object download failed", {
        code: downloadError?.name,
      });
      await deleteObject();
      return jsonError("找不到已上傳的 PDF，請重新上傳。", 404);
    }

    const bytes = Buffer.from(await fileBlob.arrayBuffer());
    const downloadedMime = fileBlob.type.toLowerCase();
    const sizeValid =
      bytes.length > PDF_MAGIC.length &&
      bytes.length <= MAX_PDF_SIZE_BYTES &&
      metadataSize === bytes.length;
    const mimeValid =
      metadataMime === "application/pdf" && downloadedMime === "application/pdf";
    const magicValid = bytes.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC);

    if (!sizeValid || !mimeValid || !magicValid) {
      console.error("[documents-complete] Uploaded object failed validation", {
        sizeValid,
        mimeValid,
        magicValid,
      });
      await deleteObject();
      return jsonError("上傳的檔案不是有效的 PDF，已安全移除。", 400);
    }

    const sha256Hex = createHash("sha256").update(bytes).digest("hex");
    const { data: document, error: insertError } = await admin
      .from("student_documents")
      .insert({
        id: body.documentId,
        user_id: user.id,
        storage_bucket: STUDENT_DOCUMENTS_BUCKET,
        storage_path: body.objectPath,
        original_filename: storedFilename,
        mime_type: "application/pdf",
        file_size_bytes: bytes.length,
        document_type: body.documentType,
        upload_status: "ready",
        sha256_hex: sha256Hex,
      })
      .select(DOCUMENT_SELECT)
      .single();

    if (insertError) {
      const { data: concurrentDocument } = await admin
        .from("student_documents")
        .select(DOCUMENT_SELECT)
        .eq("id", body.documentId)
        .eq("user_id", user.id)
        .eq("storage_path", body.objectPath)
        .maybeSingle();

      if (concurrentDocument) {
        return NextResponse.json({
          success: true,
          document: concurrentDocument,
          storagePath: buildStudentDocumentStoragePath(body.objectPath),
          replayed: true,
        });
      }

      console.error("[documents-complete] Metadata insert failed", {
        code: insertError.code,
      });
      await deleteObject();
      return jsonError("目前無法完成文件登記，請稍後再試。", 503);
    }

    return NextResponse.json({
      success: true,
      document,
      storagePath: buildStudentDocumentStoragePath(body.objectPath),
      replayed: false,
    });
  } catch (error) {
    console.error("[documents-complete] Unexpected completion failure", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    await deleteObject();
    return jsonError("目前無法完成文件上傳，請稍後再試。", 503);
  }
}
