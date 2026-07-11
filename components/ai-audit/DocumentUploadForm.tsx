"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DOCUMENT_TYPES,
  MAX_PDF_SIZE_BYTES,
  STUDENT_DOCUMENTS_BUCKET,
  validatePdfUpload,
  type UploadDocumentType,
} from "@/lib/documents/validation";

type UploadUrlResponse = {
  success?: boolean;
  error?: string;
  details?: string[];
  bucket?: string;
  documentId?: string;
  objectPath?: string;
  storagePath?: string;
  token?: string;
};

type CompleteResponse = {
  success?: boolean;
  error?: string;
  details?: string[];
  document?: {
    id: string;
    original_filename: string;
    upload_status: string;
    created_at: string;
  };
  storagePath?: string;
};

type DocumentUploadFormProps = {
  canUpload: boolean;
  reason: string | null;
  remainingPdfAudits: number;
};

const documentTypeLabels: Record<UploadDocumentType, string> = {
  thesis: "論文",
  slides: "簡報",
  draft: "研究草稿",
  paper: "Paper / 投稿稿",
};

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function DocumentUploadForm({
  canUpload,
  reason,
  remainingPdfAudits,
}: DocumentUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] =
    useState<UploadDocumentType>("thesis");
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadedDocument, setUploadedDocument] =
    useState<CompleteResponse["document"] | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setUploadedDocument(null);
    setMessage(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const validation = validatePdfUpload({
      filename: selectedFile.name,
      mimeType: selectedFile.type,
      sizeBytes: selectedFile.size,
    });

    if (!validation.valid) {
      setFile(null);
      setMessage(validation.errors.join(" "));
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setMessage("請先選擇 PDF 檔案。");
      return;
    }

    const validation = validatePdfUpload({
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });

    if (!validation.valid) {
      setMessage(validation.errors.join(" "));
      return;
    }

    setIsUploading(true);
    setMessage(null);
    setUploadedDocument(null);

    try {
      const uploadUrlResponse = await fetch("/api/documents/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          documentType,
        }),
      });
      const uploadUrlPayload =
        (await uploadUrlResponse.json()) as UploadUrlResponse;

      if (uploadUrlResponse.status === 401) {
        window.location.href = "/login?next=/dashboard/ai-audit";
        return;
      }

      if (
        !uploadUrlResponse.ok ||
        !uploadUrlPayload.success ||
        !uploadUrlPayload.objectPath ||
        !uploadUrlPayload.storagePath ||
        !uploadUrlPayload.documentId ||
        !uploadUrlPayload.token
      ) {
        setMessage(
          uploadUrlPayload.details?.join(" ") ||
            uploadUrlPayload.error ||
            "無法建立上傳連結。",
        );
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(STUDENT_DOCUMENTS_BUCKET)
        .uploadToSignedUrl(uploadUrlPayload.objectPath, uploadUrlPayload.token, file, {
          contentType: file.type,
        });

      if (uploadError) {
        setMessage(`上傳失敗：${uploadError.message}`);
        return;
      }

      const completeResponse = await fetch("/api/documents/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId: uploadUrlPayload.documentId,
          documentType,
          objectPath: uploadUrlPayload.objectPath,
        }),
      });
      const completePayload =
        (await completeResponse.json()) as CompleteResponse;

      if (!completeResponse.ok || !completePayload.success) {
        setMessage(
          completePayload.details?.join(" ") ||
            completePayload.error ||
            "檔案已上傳，但 metadata 寫入失敗。",
        );
        return;
      }

      setUploadedDocument(completePayload.document);
      setMessage("PDF 已上傳並建立文件 metadata。下一步可進入 AI 稽核流程。");
    } catch {
      setMessage("上傳流程失敗，請稍後再試。");
    } finally {
      setIsUploading(false);
    }
  }

  if (!canUpload) {
    return (
      <div className="rounded-[2rem] border border-amber-300/20 bg-amber-400/10 p-6 text-amber-50">
        <h2 className="text-xl font-semibold">目前無法上傳 PDF</h2>
        <p className="mt-3 text-sm leading-7 text-amber-100/90">
          {reason ?? "需要有效訂閱與可用 PDF audit 額度。"}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/pricing"
            className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
          >
            查看 Phase 2 訂閱方案
          </Link>
          <Link
            href="/dashboard/ai-command"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
          >
            改用 Phase 1 AI 指令產生器
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[2rem] border border-white/10 bg-slate-950/76 p-6 shadow-2xl shadow-slate-950/40"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">上傳研究 PDF</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            檔案會存入 Supabase private bucket。RAPID 不會把 PDF
            直接丟給模型；後續 AI audit route 會在 server 端讀取 PDF、轉成
            Base64，並用 <span className="text-cyan-200">mediaType:
            application/pdf</span> 封裝。
          </p>
        </div>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100">
          剩餘 PDF audit：{remainingPdfAudits}
        </span>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
        <label className="block">
          <span className="text-sm font-medium text-slate-200">文件類型</span>
          <select
            value={documentType}
            onChange={(event) =>
              setDocumentType(event.target.value as UploadDocumentType)
            }
            className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {documentTypeLabels[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-200">
            PDF 檔案（上限 {formatBytes(MAX_PDF_SIZE_BYTES)}）
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
            disabled={isUploading}
            className="mt-3 block w-full cursor-pointer rounded-2xl border border-dashed border-white/15 bg-slate-900 px-4 py-6 text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:border-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
      </div>

      {file ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
          已選擇：{file.name} · {formatBytes(file.size)}
        </div>
      ) : null}

      {message ? (
        <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-slate-200">
          {message}
        </p>
      ) : null}

      {uploadedDocument ? (
        <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
          Metadata 建立成功：{uploadedDocument.original_filename}（
          {uploadedDocument.upload_status}）
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!file || isUploading}
        className="mt-8 rounded-2xl bg-cyan-400 px-6 py-4 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
      >
        {isUploading ? "上傳與寫入 metadata 中..." : "上傳 PDF"}
      </button>
    </form>
  );
}
