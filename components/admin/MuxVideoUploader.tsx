"use client";

import { useEffect, useRef, useState } from "react";

type Props = { lessonId: string; currentStatus: string; currentPlaybackId: string | null; initialFile?: File | null; onComplete?: () => void };
const statusLabels: Record<string, string> = { uploading: "正在上傳", processing: "Mux 正在處理影片", ready: "影片準備完成", errored: "影片處理失敗", empty: "尚未上傳影片" };

async function prepareUpload(lessonId: string) {
  const response = await fetch(`/api/admin/course/lessons/${lessonId}/upload`, { method: "POST" });
  const payload = (await response.json()) as { success?: boolean; uploadUrl?: string; error?: string };
  if (!response.ok || !payload.success || !payload.uploadUrl) throw new Error(payload.error ?? "目前無法準備影片上傳。");
  return payload.uploadUrl;
}

function uploadFile(url: string, file: File, onProgress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); };
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error("upload-failed"));
    request.onerror = () => reject(new Error("upload-failed"));
    request.send(file);
  });
}

export default function MuxVideoUploader({ lessonId, currentStatus, currentPlaybackId, initialFile, onComplete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState(currentStatus);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setStatus(currentStatus), [currentStatus]);
  // The selected File is intentionally consumed once after a new draft receives its ID.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (initialFile) void chooseFile(initialFile); }, [initialFile]);
  useEffect(() => {
    if (status !== "uploading" && status !== "processing") return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/admin/course/lessons/${lessonId}/status`, { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { status?: string };
      if (payload.status) { setStatus(payload.status); if (payload.status === "ready" || payload.status === "errored") { window.clearInterval(timer); onComplete?.(); } }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [lessonId, onComplete, status]);
  async function chooseFile(file: File | undefined) {
    if (!file || busy) return;
    setBusy(true); setMessage(null); setProgress(0);
    try { const url = await prepareUpload(lessonId); setStatus("uploading"); await uploadFile(url, file, setProgress); setStatus("processing"); setMessage("影片已上傳，正在處理中；完成後會自動更新狀態。"); onComplete?.(); }
    catch { setStatus("errored"); setMessage("影片上傳失敗，請重新選擇影片再試一次。"); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }
  const ready = status === "ready";
  return <section className="mt-4 rounded-2xl border border-dashed border-cyan-300/30 bg-cyan-400/[0.04] p-5" aria-labelledby="course-video-upload-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p id="course-video-upload-title" className="text-sm font-semibold text-white">影片</p><p className="mt-2 text-xs leading-5 text-slate-400">選擇 MP4 / H.264 影片，檔案會直接安全傳送至 Mux。</p></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200">{statusLabels[status] ?? status}</span></div>
    {status === "uploading" ? <div className="mt-4"><div className="flex justify-between text-xs text-slate-300"><span>上傳進度</span><span>{progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900" role="progressbar" aria-label="影片上傳進度" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-cyan-400 transition-[width]" style={{ width: `${progress}%` }} /></div></div> : null}
    {status === "processing" ? <p className="mt-4 text-sm text-amber-100">影片已上傳，Mux 正在處理；不需要重新整理頁面。</p> : null}
    {ready ? <p className="mt-4 text-sm text-emerald-200">✓ 影片準備完成，可以預覽或發布。</p> : null}
    {status === "errored" ? <p className="mt-4 text-sm text-red-200">影片處理失敗，請重新上傳。</p> : null}
    <input ref={inputRef} type="file" accept="video/mp4,video/webm,.mp4,.webm" className="sr-only" onChange={(event) => void chooseFile(event.target.files?.[0])} />
    <button type="button" disabled={busy || status === "processing"} onClick={() => inputRef.current?.click()} className="mt-4 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">{busy ? "上傳準備中…" : currentPlaybackId ? "更換影片" : "選擇影片"}</button>
    {message ? <p className="mt-3 text-sm text-amber-200" role="status">{message}</p> : null}
  </section>;
}
