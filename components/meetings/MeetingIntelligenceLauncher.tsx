"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MeetingIntelligenceAnalysis } from "@/lib/meeting-intelligence/meeting-intelligence-domain";

type Method = "record" | "upload" | "transcript";
type IntelligenceState = { id: string; status: "draft" | "confirmed" | "discarded"; analysis: MeetingIntelligenceAnalysis | null };

function userMessage(error: unknown) {
  if (typeof error === "string" && error.length < 220) return error;
  return "目前無法整理這次 Meeting，請稍後再試。";
}

export function MeetingIntelligenceLauncher({ meetingId }: { meetingId: string }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<Method>("transcript");
  const [consent, setConsent] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState<IntelligenceState | null>(null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [actions, setActions] = useState<boolean[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    let mounted = true;
    void fetch(`/api/meeting-intelligence/status?meetingId=${encodeURIComponent(meetingId)}`)
      .then((response) => response.json())
      .then((body: { intelligence?: IntelligenceState | null }) => {
        if (mounted && body.intelligence) {
          setAnalysis(body.intelligence);
          setActions(body.intelligence.analysis?.suggestedActions.map(() => true) ?? []);
        }
      }).catch(() => undefined);
    return () => { mounted = false; };
  }, [meetingId]);

  function resetError() { if (error) setError(""); }

  async function processRecording(recordingId: string) {
    const response = await fetch("/api/meeting-intelligence/process", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ recordingId }) });
    const body = await response.json() as { success?: boolean; analysis?: MeetingIntelligenceAnalysis | null; intelligenceId?: string; message?: string; error?: string };
    if (!response.ok || !body.success || !body.analysis || !body.intelligenceId) throw new Error(body.message || body.error || "PROCESSING_FAILED");
    const next = { id: body.intelligenceId, status: "draft" as const, analysis: body.analysis };
    setAnalysis(next);
    setActions(body.analysis.suggestedActions.map(() => true));
  }

  async function uploadFile(file: File) {
    if (!consent) { setError("請先同意錄音或上傳內容僅用於這次 Meeting 整理。結束後 raw audio 會刪除。"); return; }
    setBusy(true); resetError();
    try {
      const uploadResponse = await fetch("/api/meeting-intelligence/upload-url", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ meetingId, filename: file.name, mimeType: file.type || "audio/webm", sizeBytes: file.size, consent }) });
      const uploadBody = await uploadResponse.json() as { success?: boolean; recordingId?: string; path?: string; token?: string; error?: string };
      if (!uploadResponse.ok || !uploadBody.success || !uploadBody.recordingId || !uploadBody.path || !uploadBody.token) throw new Error(uploadBody.error || "UPLOAD_FAILED");
      const supabase = createClient();
      const { error: storageError } = await supabase.storage.from("meeting-audio").uploadToSignedUrl(uploadBody.path, uploadBody.token, file);
      if (storageError) throw new Error("上傳錄音失敗，請稍後再試。");
      await processRecording(uploadBody.recordingId);
    } catch (uploadError) { setError(userMessage(uploadError instanceof Error ? uploadError.message : uploadError)); }
    finally { setBusy(false); }
  }

  async function submitTranscript() {
    if (transcript.trim().length < 20) { setError("請貼上至少 20 個字的逐字稿。"); return; }
    setBusy(true); resetError();
    try {
      const response = await fetch("/api/meeting-intelligence/transcript", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ meetingId, transcript }) });
      const body = await response.json() as { success?: boolean; intelligenceId?: string; analysis?: MeetingIntelligenceAnalysis | null; message?: string; error?: string };
      if (!response.ok || !body.success || !body.analysis || !body.intelligenceId) throw new Error(body.message || body.error || "TRANSCRIPT_FAILED");
      setAnalysis({ id: body.intelligenceId, status: "draft", analysis: body.analysis });
      setActions(body.analysis.suggestedActions.map(() => true));
    } catch (submitError) { setError(userMessage(submitError instanceof Error ? submitError.message : submitError)); }
    finally { setBusy(false); }
  }

  async function startRecording() {
    if (!consent) { setError("請先同意錄音內容僅用於這次 Meeting 整理。"); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setError("此瀏覽器不支援麥克風錄音，請改用上傳或貼上逐字稿。"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type)) || "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      streamRef.current = stream; recorderRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const extension = blob.type.includes("mp4") ? "m4a" : "webm";
        void uploadFile(new File([blob], `meeting-${meetingId}.${extension}`, { type: blob.type }));
        stream.getTracks().forEach((track) => track.stop()); streamRef.current = null; recorderRef.current = null;
      };
      recorder.start(1000); setRecording(true); resetError();
    } catch { setError("無法取得麥克風權限，請改用上傳或貼上逐字稿。"); }
  }

  function stopRecording() { recorderRef.current?.stop(); setRecording(false); }

  async function confirmAnalysis() {
    if (!analysis?.analysis) return;
    setBusy(true); resetError();
    try {
      const response = await fetch("/api/meeting-intelligence/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ intelligenceId: analysis.id, summary: analysis.analysis.summary, decisions: analysis.analysis.decisions.join("\n"), actions: analysis.analysis.suggestedActions.map((action, index) => ({ title: action.title, dueDate: action.dueDate, selected: actions[index] })) }) });
      const body = await response.json() as { success?: boolean; message?: string; error?: string };
      if (!response.ok || !body.success) throw new Error(body.error || "CONFIRM_FAILED");
      setAnalysis({ ...analysis, status: "confirmed" });
    } catch (confirmError) { setError(userMessage(confirmError instanceof Error ? confirmError.message : confirmError)); }
    finally { setBusy(false); }
  }

  return <div className="mt-5 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.04] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-cyan-100">Meeting Intelligence</p><p className="mt-1 text-xs text-slate-400">把討論整理成摘要、決定與可審核的下一步。</p></div><button type="button" onClick={() => { setOpen(!open); resetError(); }} className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80">{open ? "收起整理" : "整理這次 Meeting"}</button></div>{analysis?.status === "confirmed" ? <p className="mt-3 text-sm text-emerald-200">✓ 已確認並寫入既有 Meeting / Action</p> : null}{open ? <div className="mt-4 space-y-4 border-t border-white/10 pt-4"><fieldset disabled={busy || recording} className="space-y-3"><legend className="text-sm font-semibold text-white">選擇輸入方式</legend><div className="flex flex-wrap gap-2">{([ ["transcript", "貼上逐字稿"], ["upload", "上傳錄音"], ["record", "直接錄音"]] as Array<[Method, string]>).map(([value, label]) => <button key={value} type="button" onClick={() => { setMethod(value); resetError(); }} className={`rounded-xl border px-3 py-2 text-sm ${method === value ? "border-cyan-300 bg-cyan-400/10 text-cyan-100" : "border-white/10 text-slate-300"}`}>{label}</button>)}</div>{method !== "transcript" ? <label className="flex items-start gap-2 text-xs leading-5 text-slate-400"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" />我同意這段錄音/上傳內容只用於這次 Meeting 整理；原始音檔成功轉錄後會刪除，逐字稿與 AI 草稿只供我審核。</label> : null}</fieldset>{method === "transcript" ? <div className="space-y-3"><textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} maxLength={60000} placeholder="貼上會議逐字稿，至少 20 個字" className="min-h-36 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70" /><button type="button" disabled={busy} onClick={() => void submitTranscript()} className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "整理中..." : "開始整理"}</button></div> : null}{method === "upload" ? <label className="block rounded-2xl border border-dashed border-white/20 p-5 text-sm text-slate-300">選擇 MP3、M4A、WAV、WEBM 或 OGG（目前單檔 25 MB 內）<input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/webm,audio/ogg" className="mt-3 block w-full text-sm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadFile(file); }} /></label> : null}{method === "record" ? <div><button type="button" disabled={busy} onClick={() => { if (recording) stopRecording(); else void startRecording(); }} className={`rounded-xl px-4 py-2 text-sm font-semibold ${recording ? "bg-red-500 text-white" : "bg-cyan-300 text-slate-950"}`}>{recording ? "停止錄音並整理" : "開始錄音"}</button>{recording ? <p className="mt-2 text-xs text-red-200">錄音進行中，按鈕會停止並開始整理。</p> : null}</div> : null}{analysis?.analysis ? <div className="space-y-4 rounded-2xl border border-amber-300/20 bg-amber-400/[0.06] p-4"><p className="text-sm font-semibold text-amber-100">AI 草稿，請確認後才會寫入</p><div><p className="text-xs text-slate-400">摘要</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{analysis.analysis.summary}</p></div>{analysis.analysis.decisions.length ? <div><p className="text-xs text-slate-400">決定</p><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-200">{analysis.analysis.decisions.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}{analysis.analysis.suggestedActions.length ? <div><p className="text-xs text-slate-400">下一步（可取消勾選）</p><div className="mt-2 space-y-2">{analysis.analysis.suggestedActions.map((action, index) => <label key={`${action.title}-${index}`} className="flex gap-2 text-sm text-slate-200"><input type="checkbox" checked={actions[index] ?? false} onChange={(event) => setActions(actions.map((checked, itemIndex) => itemIndex === index ? event.target.checked : checked))} />{action.title}{action.dueDate ? `（截止 ${action.dueDate}）` : "（未提供明確期限）"}</label>)}</div></div> : null}<button type="button" disabled={busy || analysis.status === "confirmed"} onClick={() => void confirmAnalysis()} className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{analysis.status === "confirmed" ? "已確認" : busy ? "確認中..." : "確認並寫入 Meeting / Actions"}</button></div> : null}{error ? <p role="alert" className="text-sm text-red-200">{error}</p> : null}</div> : null}</div>;
}
