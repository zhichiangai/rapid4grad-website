"use client";

import { useEffect, useRef, useState } from "react";
import type { ProfessorAiContextType, ProfessorAiProposal } from "@/lib/professor/ai-contract";

type Props = { contextType: ProfessorAiContextType; labId?: string | null; studentId?: string | null };

export function ProfessorAiEntry({ contextType, labId = null, studentId = null }: Props) {
  const [message, setMessage] = useState("");
  const [proposal, setProposal] = useState<ProfessorAiProposal | null>(null);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setSeconds(Math.min(120, Math.floor((Date.now() - startedAtRef.current) / 1000))), 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  async function submitText() {
    if (!message.trim()) return;
    setPending(true); setFeedback(null);
    try {
      const response = await fetch("/api/professor/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message, contextType, labId, studentId }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error ?? "RAPID AI 暫時無法使用。");
      setProposal(result.proposal); setOperationId(result.operationId); setMessage("");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "RAPID AI 暫時無法使用。"); }
    finally { setPending(false); }
  }

  async function startRecording() {
    setFeedback(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setFeedback("此瀏覽器不支援語音輸入，請改用文字。 "); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const durationSeconds = Math.min(120, Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000)));
        const form = new FormData();
        form.append("audio", new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }), "rapid-voice.webm");
        form.append("durationSeconds", String(durationSeconds)); form.append("contextType", contextType);
        if (labId) form.append("labId", labId); if (studentId) form.append("studentId", studentId);
        setPending(true);
        try {
          const response = await fetch("/api/professor/ai/voice", { method: "POST", body: form });
          const result = await response.json();
          if (!response.ok || !result.success) throw new Error(result.error ?? "語音 RAPID AI 暫時無法使用。");
          setProposal(result.proposal); setOperationId(result.operationId);
        } catch (error) { setFeedback(error instanceof Error ? error.message : "語音 RAPID AI 暫時無法使用。"); }
        finally { setPending(false); }
      };
      recorderRef.current = recorder; startedAtRef.current = Date.now(); setSeconds(0); setRecording(true); recorder.start();
    } catch { setFeedback("無法取得麥克風權限，請改用文字或檢查瀏覽器設定。"); }
  }

  function stopRecording() {
    recorderRef.current?.stop(); recorderRef.current = null; setRecording(false);
  }

  async function confirmProposal() {
    if (!operationId || !proposal) return;
    setPending(true); setFeedback(null);
    try {
      const response = await fetch(`/api/professor/ai/operations/${operationId}/confirm`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ proposal }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error ?? "確認執行失敗。");
      setProposal(null); setOperationId(null); setFeedback("已確認並完成這個 RAPID AI 操作。");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "確認執行失敗。"); }
    finally { setPending(false); }
  }

  async function cancelProposal() {
    if (!operationId) return;
    await fetch(`/api/professor/ai/operations/${operationId}/cancel`, { method: "POST" });
    setProposal(null); setOperationId(null); setFeedback("已取消 proposal。");
  }

  return <section className="rounded-[2rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_38%),rgba(15,23,42,0.7)] p-5 sm:p-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">RAPID AI</p><h2 className="mt-2 text-2xl font-semibold text-white">用一句話準備下一個指導動作</h2></div><p className="text-xs text-slate-500">文字或 Push-to-talk 語音，寫入前一定確認</p></div><div className="mt-5 flex flex-col gap-3 sm:flex-row"><textarea value={message} onChange={(event) => setMessage(event.target.value)} disabled={pending || recording} placeholder="例如：幫我整理本週需要優先處理的學生" className="min-h-20 flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:opacity-50" /><div className="flex shrink-0 flex-row gap-2 sm:flex-col"><button type="button" onClick={submitText} disabled={pending || recording || !message.trim()} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">建立 Proposal</button>{recording ? <button type="button" onClick={stopRecording} className="rounded-xl border border-red-300/30 bg-red-400/10 px-4 py-2.5 text-sm font-semibold text-red-100">停止 {seconds}s / 120s</button> : <button type="button" onClick={startRecording} disabled={pending} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 disabled:opacity-50">開始語音</button>}</div></div>{proposal ? <div className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-400/[0.08] p-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Proposal</p><h3 className="mt-2 text-lg font-semibold text-white">{proposal.title}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{proposal.explanation}</p><label className="mt-4 block text-sm text-slate-200">可編輯標題<input value={proposal.fields.title ?? ""} onChange={(event) => setProposal({ ...proposal, fields: { ...proposal.fields, title: event.target.value } })} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70" /></label><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={confirmProposal} disabled={pending} className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50">確認執行</button><button type="button" onClick={cancelProposal} disabled={pending} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200">取消</button></div></div> : null}{feedback ? <p className="mt-4 text-sm text-cyan-100" role="status">{feedback}</p> : null}</section>;
}
