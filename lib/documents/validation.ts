export const STUDENT_DOCUMENTS_BUCKET = "student-documents";

export const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_DOCUMENT_MIME_TYPES = ["application/pdf"] as const;

export const ALLOWED_DOCUMENT_EXTENSIONS = [".pdf"] as const;

export const DOCUMENT_TYPES = ["thesis", "slides", "draft", "paper"] as const;

export type UploadDocumentType = (typeof DOCUMENT_TYPES)[number];

export type DocumentUploadValidationInput = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

export function isUploadDocumentType(
  value: unknown,
): value is UploadDocumentType {
  return (
    typeof value === "string" &&
    DOCUMENT_TYPES.includes(value as UploadDocumentType)
  );
}

export function sanitizePdfFilename(filename: string) {
  const normalized = filename
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  const withoutPath = normalized.split("/").pop()?.split("\\").pop() || "";
  const base = withoutPath.endsWith(".pdf")
    ? withoutPath.slice(0, -4)
    : withoutPath;
  const safeBase = base.replace(/\.+$/g, "") || "rapid4grad-document";

  return `${safeBase}.pdf`;
}

export function buildStudentDocumentObjectPath({
  userId,
  documentId,
  filename,
}: {
  userId: string;
  documentId: string;
  filename: string;
}) {
  return `${userId}/${documentId}/${sanitizePdfFilename(filename)}`;
}

export function buildStudentDocumentStoragePath(objectPath: string) {
  return `${STUDENT_DOCUMENTS_BUCKET}/${objectPath}`;
}

export function validatePdfUpload(input: DocumentUploadValidationInput) {
  const errors: string[] = [];
  const lowerFilename = input.filename.trim().toLowerCase();

  if (!input.filename.trim()) {
    errors.push("檔案名稱不可為空。");
  }

  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(input.mimeType as "application/pdf")) {
    errors.push("只支援 PDF 檔案。");
  }

  if (!ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => lowerFilename.endsWith(ext))) {
    errors.push("檔案副檔名必須是 .pdf。");
  }

  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    errors.push("檔案大小無效。");
  }

  if (input.sizeBytes > MAX_PDF_SIZE_BYTES) {
    errors.push("PDF 大小不可超過 10MB。");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function assertValidDocumentId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
