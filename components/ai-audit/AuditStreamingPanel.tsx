"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  startTransition,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AI_AUDIT_TYPES,
  type AiAuditType,
} from "@/lib/ai/audit-prompts";
import {
  AI_AUDIT_PROVIDERS,
  type AiAuditProvider,
} from "@/lib/ai/providers";

type AuditDocument = {
  id: string;
  original_filename: string;
  document_type: string;
  created_at: string;
};

type AuditStreamingPanelProps = {
  documents: AuditDocument[];
  canAudit: boolean;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AuditStreamingPanel({
  documents,
  canAudit,
}: AuditStreamingPanelProps) {
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState(
    documents[0]?.id ?? "",
  );
  const [provider, setProvider] = useState<AiAuditProvider>("openai");
  const [auditType, setAuditType] = useState<AiAuditType>("full_review");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId),
    [documents, selectedDocumentId],
  );

  async function handleAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDocumentId) {
      setMessage("請先上傳並選擇一份 PDF。");
      return;
    }

    setIsStreaming(true);
    setStreamedText("");
    setMessage(null);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/ai/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId: selectedDocumentId,
          provider,
          auditType,
          idempotencyKey: crypto.randomUUID(),
        }),
        signal: abortController.signal,
      });

      if (response.status === 401) {
        window.location.href = "/login?next=/dashboard/ai-audit";
        return;
      }

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setMessage(payload?.error || "AI 稽核啟動失敗。");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        setStreamedText(
          (current) => current + decoder.decode(value, { stream: true }),
        );
      }

      const finalText = decoder.decode();
      if (finalText) setStreamedText((current) => current + finalText);
      setMessage("AI 稽核完成，結果與 Lab 共用額度已安全寫入資料庫。");
      startTransition(() => router.refresh());
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setMessage("已停止 AI 稽核，預留的 Lab 共用額度會自動退回。");
      } else {
        setMessage("AI 稽核失敗且不會扣除額度。你可以先改用 Phase 1 fallback。");
      }
    } finally {
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }

  function handleCancel() {
    abortControllerRef.current?.abort();
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/76 p-6 shadow-2xl shadow-slate-950/40">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">AI 學術漏洞稽核</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            選擇已上傳的 PDF、provider 與稽核模式後，RAPID 會在 server
            端讀取 private PDF 並以 Base64 多模態格式交給模型。
          </p>
        </div>
        <Link
          href="/dashboard/ai-command"
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
        >
          Phase 1 fallback
        </Link>
      </div>

      <form onSubmit={handleAudit} className="mt-8 grid gap-5 lg:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-200">PDF 文件</span>
          <select
            value={selectedDocumentId}
            onChange={(event) => setSelectedDocumentId(event.target.value)}
            disabled={documents.length === 0 || isStreaming}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 disabled:opacity-60"
          >
            {documents.length === 0 ? (
              <option value="">尚未上傳 PDF</option>
            ) : (
              documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.original_filename} · {formatDate(document.created_at)}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-200">AI Provider</span>
          <select
            value={provider}
            onChange={(event) =>
              setProvider(event.target.value as AiAuditProvider)
            }
            disabled={isStreaming}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 disabled:opacity-60"
          >
            {Object.entries(AI_AUDIT_PROVIDERS).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-200">稽核模式</span>
          <select
            value={auditType}
            onChange={(event) => setAuditType(event.target.value as AiAuditType)}
            disabled={isStreaming}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 disabled:opacity-60"
          >
            {Object.entries(AI_AUDIT_TYPES).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap gap-3 lg:col-span-3">
          <button
            type="submit"
            disabled={!canAudit || !selectedDocument || isStreaming}
            className="rounded-2xl bg-cyan-400 px-6 py-4 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          >
            {isStreaming ? "AI 稽核串流中..." : "開始 AI 稽核"}
          </button>
          {isStreaming ? (
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-2xl border border-rose-300/25 bg-rose-400/10 px-6 py-4 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/20"
            >
              停止並退回預留額度
            </button>
          ) : null}
        </div>
      </form>

      {message ? (
        <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-slate-200">
          {message}
        </p>
      ) : null}

      <div className="mt-6 min-h-72 rounded-3xl border border-white/10 bg-slate-900/90 p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-slate-200">Streaming Result</p>
          {isStreaming ? (
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
              streaming · reserved 1 credit
            </span>
          ) : null}
        </div>
        {streamedText ? (
          <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-200">
            {streamedText}
          </pre>
        ) : (
          <p className="text-sm leading-7 text-slate-500">
            AI 稽核結果會即時串流顯示在這裡。若模型或額度失敗，請先使用
            Phase 1 fallback 產生外部 AI 指令。
          </p>
        )}
      </div>
    </section>
  );
}
