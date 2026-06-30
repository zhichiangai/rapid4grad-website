import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  assertValidDocumentId,
  buildStudentDocumentObjectPath,
  buildStudentDocumentStoragePath,
  isUploadDocumentType,
  STUDENT_DOCUMENTS_BUCKET,
  validatePdfUpload,
} from "@/lib/documents/validation";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

type CompleteUploadRequestBody = {
  documentId?: unknown;
  filename?: unknown;
  mimeType?: unknown;
  sizeBytes?: unknown;
  documentType?: unknown;
  objectPath?: unknown;
  storagePath?: unknown;
};

function jsonError(message: string, status = 400, extra?: Record<string, Json>) {
  return NextResponse.json(
    { success: false, error: message, ...extra },
    { status },
  );
}

async function storageObjectExists(objectPath: string) {
  const admin = createAdminClient();
  const folderPath = objectPath.split("/").slice(0, -1).join("/");
  const filename = objectPath.split("/").pop();

  if (!folderPath || !filename) {
    return false;
  }

  const { data, error } = await admin.storage
    .from(STUDENT_DOCUMENTS_BUCKET)
    .list(folderPath, {
      limit: 100,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data.some((item) => item.name === filename);
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
    return jsonError("Login is required before completing upload.", 401);
  }

  let body: CompleteUploadRequestBody;

  try {
    body = (await request.json()) as CompleteUploadRequestBody;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (
    typeof body.documentId !== "string" ||
    typeof body.filename !== "string" ||
    typeof body.mimeType !== "string" ||
    typeof body.sizeBytes !== "number" ||
    typeof body.objectPath !== "string" ||
    typeof body.storagePath !== "string"
  ) {
    return jsonError(
      "documentId, filename, mimeType, sizeBytes, objectPath, and storagePath are required.",
      400,
    );
  }

  if (!assertValidDocumentId(body.documentId)) {
    return jsonError("Invalid documentId.", 400);
  }

  if (!isUploadDocumentType(body.documentType)) {
    return jsonError("Unsupported document type.", 400);
  }

  const validation = validatePdfUpload({
    filename: body.filename,
    mimeType: body.mimeType,
    sizeBytes: body.sizeBytes,
  });

  if (!validation.valid) {
    return jsonError("Invalid PDF upload.", 400, {
      details: validation.errors,
    });
  }

  const expectedObjectPath = buildStudentDocumentObjectPath({
    userId: user.id,
    documentId: body.documentId,
    filename: body.filename,
  });
  const expectedStoragePath = buildStudentDocumentStoragePath(expectedObjectPath);

  if (
    body.objectPath !== expectedObjectPath ||
    body.storagePath !== expectedStoragePath
  ) {
    return jsonError("Storage path does not match the authenticated user.", 403);
  }

  try {
    const exists = await storageObjectExists(expectedObjectPath);

    if (!exists) {
      return jsonError("Uploaded file was not found in private storage.", 404);
    }

    const admin = createAdminClient();
    const { data: document, error } = await admin
      .from("student_documents")
      .insert({
        id: body.documentId,
        user_id: user.id,
        lab_id: null,
        storage_bucket: STUDENT_DOCUMENTS_BUCKET,
        storage_path: expectedObjectPath,
        original_filename: body.filename,
        mime_type: body.mimeType,
        file_size_bytes: body.sizeBytes,
        document_type: body.documentType,
        upload_status: "ready",
      })
      .select(
        "id,storage_bucket,storage_path,original_filename,mime_type,file_size_bytes,document_type,upload_status,created_at",
      )
      .single();

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({
      success: true,
      document,
      storagePath: expectedStoragePath,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Document completion failed.";
    return jsonError(message, 500);
  }
}
