"use client";

import MuxUploader from "@mux/mux-uploader-react";
import { useState } from "react";

type Props = { lessonId: string; currentStatus: string; currentPlaybackId: string | null };

const statusLabels: Record<string, string> = {
  uploading: "正在上傳",
  processing: "Mux 正在處理影片…",
  ready: "影片準備完成",
  errored: "影片處理失敗",
  empty: "尚未上傳影片",
};

export default function MuxVideoUploader({ lessonId, currentStatus, currentPlaybackId }: Props) {
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  async function prepareUpload() {
    setMessage(null);
    setProgress(0);
    const response = await fetch(`/api/admin/course/lessons/${lessonId}/upload`, { method: "POST" });
    const payload = (await response.json()) as { success?: boolean; uploadUrl?: string; error?: string };
    if (!response.ok || !payload.success || !payload.uploadUrl) {
      setMessage(payload.error ?? "目前無法準備影片上傳。");
      return;
    }
    setEndpoint(payload.uploadUrl);
  }

  if (!endpoint) {
    return <div className="mt-3 rounded-2xl border border-dashed border-cyan-300/30 bg-cyan-400/[0.04] p-5"><p className="text-sm font-semibold text-white">課程影片</p><p className="mt-2 text-xs leading-5 text-slate-400">在 RAPID 直接上傳影片，建議使用 MP4 / H.264 / 1080p。</p><p className="mt-2 text-xs text-slate-500">目前狀態：{statusLabels[currentStatus] ?? currentStatus}</p>{currentPlaybackId ? <p className="mt-1 text-xs text-emerald-200">目前影片仍可播放，可直接替換。</p> : null}<button type="button" onClick={() => void prepareUpload()} className="mt-4 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950">{currentPlaybackId ? "替換影片" : "選擇影片"}</button>{message ? <p className="mt-3 text-sm text-amber-200">{message}</p> : null}</div>;
  }

  return <div className="mt-3 rounded-2xl border border-cyan-300/30 bg-cyan-400/[0.04] p-5"><p className="text-sm font-semibold text-white">選擇影片並上傳</p><p className="mt-2 text-xs leading-5 text-slate-400">影片會直接傳送至 Mux，不會經過 RAPID 伺服器。</p><MuxUploader endpoint={endpoint} pausable onProgress={(event) => setProgress(Math.round("detail" in event && typeof event.detail === "number" ? event.detail : 0))} onSuccess={() => setMessage("✓ 上傳完成，Mux 正在處理影片…")} onUploadError={() => setMessage("影片上傳失敗，請重試。")} className="mt-4 block w-full" /><p className="mt-3 text-xs text-slate-400">上傳進度：{progress}%</p><button type="button" onClick={() => setEndpoint(null)} className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200">返回</button></div>;
}
