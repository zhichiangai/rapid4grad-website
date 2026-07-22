"use client";

import { useState } from "react";

type LabOption = { id: string; name: string };
type ShareState = { documentId: string; labId: string; shared: boolean };

export function AuditSummarySharing({
  documents,
  labs,
  initialShares,
}: {
  documents: Array<{ id: string; original_filename: string }>;
  labs: LabOption[];
  initialShares: ShareState[];
}) {
  const [shares, setShares] = useState(initialShares);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function toggle(documentId: string, labId: string, shared: boolean) {
    const key = `${documentId}:${labId}`;
    setPendingKey(key);
    setMessage(null);
    try {
      const response = await fetch("/api/documents/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          labId,
          action: shared ? "revoke" : "grant",
        }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        shared?: boolean;
      };
      if (!response.ok || !payload.success) {
        setMessage(payload.error ?? "目前無法更新分享設定。");
        return;
      }
      setShares((current) => [
        ...current.filter(
          (item) => item.documentId !== documentId || item.labId !== labId,
        ),
        { documentId, labId, shared: Boolean(payload.shared) },
      ]);
      setMessage(payload.shared ? "已分享稽核摘要。" : "已撤回稽核摘要分享。");
    } catch {
      setMessage("目前無法連線更新分享設定，請稍後再試。");
    } finally {
      setPendingKey(null);
    }
  }

  if (documents.length === 0 || labs.length === 0) return null;

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
      <h2 className="text-xl font-semibold">分享 AI 稽核摘要</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        預設完全私人。開啟後，指定 Lab 的教授與助理只能查看稽核摘要、風險與卡點，不能讀取 PDF 本文或 Storage 檔案。你可以隨時撤回。
      </p>
      <div className="mt-5 space-y-4">
        {documents.map((document) => (
          <div key={document.id} className="rounded-2xl border border-white/10 p-4">
            <p className="font-medium text-slate-100">{document.original_filename}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {labs.map((lab) => {
                const shared = shares.some(
                  (item) =>
                    item.documentId === document.id &&
                    item.labId === lab.id &&
                    item.shared,
                );
                const key = `${document.id}:${lab.id}`;
                return (
                  <button
                    key={lab.id}
                    type="button"
                    disabled={pendingKey === key}
                    onClick={() => toggle(document.id, lab.id, shared)}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                      shared
                        ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                        : "border-white/10 bg-slate-900 text-slate-300 hover:border-cyan-300/30"
                    }`}
                  >
                    {pendingKey === key
                      ? "更新中..."
                      : shared
                        ? `${lab.name}：已分享，點擊撤回`
                        : `分享給 ${lab.name}`}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {message ? (
        <p aria-live="polite" className="mt-4 text-sm text-cyan-100">
          {message}
        </p>
      ) : null}
    </section>
  );
}
