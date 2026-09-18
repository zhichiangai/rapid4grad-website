import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { analyzeMeetingTranscript, transcribeProfessorAudio } from "@/lib/professor/groq";
import { isMeetingIntelligenceAnalysis, trimAnalysis } from "@/lib/meeting-intelligence/meeting-intelligence-domain";
import { createV2AdminClient } from "@/lib/supabase/server";

const AUDIO_BUCKET = "meeting-audio";
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const GROQ_DIRECT_BYTES = 25 * 1024 * 1024;
const AUDIO_TYPES = new Set(["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg"]);

type AnyClient = SupabaseClient;

export function isSupportedMeetingAudio(mimeType: string, sizeBytes: number) {
  return AUDIO_TYPES.has(mimeType) && sizeBytes > 0 && sizeBytes <= MAX_UPLOAD_BYTES;
}

export function meetingAudioError(sizeBytes: number) {
  if (sizeBytes > MAX_UPLOAD_BYTES) return "錄音檔超過 100 MB，請壓縮、切段或改貼上逐字稿。";
  if (sizeBytes > GROQ_DIRECT_BYTES) return "這個檔案超過目前 Groq 直接轉錄的 25 MB 上限，請先壓縮、切段或改貼上逐字稿。";
  return "目前不支援這種錄音格式，請使用 MP3、M4A、WAV、WEBM 或逐字稿。";
}

export async function assertStudentMeeting(supabase: AnyClient, userId: string, meetingId: string) {
  const { data, error } = await supabase.from("meetings").select("id,lab_id,student_user_id,meeting_at,summary,created_by,status").eq("id", meetingId).eq("student_user_id", userId).maybeSingle();
  if (error || !data) throw new Error("MEETING_NOT_AVAILABLE");
  if (data.created_by !== userId) throw new Error("MEETING_NOT_AVAILABLE");
  return data as { id: string; lab_id: string | null; student_user_id: string; meeting_at: string; summary: string | null; created_by: string; status: string };
}

export async function createMeetingUploadUrl(input: { supabase: AnyClient; userId: string; meetingId: string; filename: string; mimeType: string; sizeBytes: number }) {
  await assertStudentMeeting(input.supabase, input.userId, input.meetingId);
  if (!isSupportedMeetingAudio(input.mimeType, input.sizeBytes)) throw new Error(meetingAudioError(input.sizeBytes));
  const extension = input.filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "webm";
  const path = `${input.userId}/${input.meetingId}/${crypto.randomUUID()}.${extension}`;
  const { data: recording, error: insertError } = await input.supabase.from("meeting_recordings").insert({
    meeting_id: input.meetingId,
    student_user_id: input.userId,
    source_type: "upload",
    storage_path: path,
    original_filename: input.filename.slice(0, 240),
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
    status: "uploading",
  }).select("id").single();
  if (insertError || !recording) throw new Error("MEETING_RECORDING_CREATE_FAILED");
  const admin = createV2AdminClient();
  const { data: signed, error: signedError } = await admin.storage.from(AUDIO_BUCKET).createSignedUploadUrl(path);
  if (signedError || !signed) {
    await input.supabase.from("meeting_recordings").delete().eq("id", recording.id);
    throw new Error("MEETING_RECORDING_UPLOAD_URL_FAILED");
  }
  return { recordingId: recording.id as string, path, token: signed.token };
}

export async function createTranscriptRecording(input: { supabase: AnyClient; userId: string; meetingId: string; transcript: string }) {
  const meeting = await assertStudentMeeting(input.supabase, input.userId, input.meetingId);
  const transcript = input.transcript.trim().slice(0, 60_000);
  if (transcript.length < 20) throw new Error("MEETING_TRANSCRIPT_TOO_SHORT");
  const { data: recording, error } = await input.supabase.from("meeting_recordings").insert({
    meeting_id: meeting.id,
    student_user_id: input.userId,
    source_type: "transcript",
    original_filename: null,
    mime_type: "text/plain",
    size_bytes: new TextEncoder().encode(transcript).byteLength,
    status: "queued",
  }).select("id").single();
  if (error || !recording) throw new Error("MEETING_RECORDING_CREATE_FAILED");
  const { data: intelligence, error: intelligenceError } = await input.supabase.from("meeting_intelligence").insert({
    meeting_id: meeting.id,
    recording_id: recording.id,
    student_user_id: input.userId,
    transcript_text: transcript,
    status: "draft",
  }).select("id").single();
  if (intelligenceError || !intelligence) throw new Error("MEETING_INTELLIGENCE_CREATE_FAILED");
  return { recordingId: recording.id as string, intelligenceId: intelligence.id as string };
}

function providerMessage(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  if (code === "GROQ_API_KEY_CONFIGURATION_REQUIRED") return "AI 服務尚未設定，逐字稿已保留，請稍後再試。";
  if (code === "GROQ_AUDIO_TOO_LARGE") return "錄音檔超過目前轉錄上限，請改用壓縮檔、切段或逐字稿。";
  return "AI 整理失敗，逐字稿已保留，你可以稍後重試。";
}

export async function processMeetingRecording(input: { supabase: AnyClient; userId: string; recordingId: string }) {
  const { data: recording, error } = await input.supabase.from("meeting_recordings").select("id,meeting_id,student_user_id,source_type,storage_path,original_filename,mime_type,size_bytes,status").eq("id", input.recordingId).eq("student_user_id", input.userId).maybeSingle();
  if (error || !recording) throw new Error("MEETING_RECORDING_NOT_AVAILABLE");
  const meeting = await assertStudentMeeting(input.supabase, input.userId, recording.meeting_id as string);
  const existing = await input.supabase.from("meeting_intelligence").select("id,transcript_text,analysis,status").eq("recording_id", recording.id).eq("student_user_id", input.userId).maybeSingle();
  let transcript = typeof existing.data?.transcript_text === "string" ? existing.data.transcript_text : "";
  try {
    await input.supabase.from("meeting_recordings").update({ status: transcript ? "analyzing" : "transcribing", error_code: null }).eq("id", recording.id);
    if (!transcript) {
      if (!recording.storage_path || Number(recording.size_bytes) > GROQ_DIRECT_BYTES) throw new Error("GROQ_AUDIO_TOO_LARGE");
      const admin = createV2AdminClient();
      const { data: fileData, error: downloadError } = await admin.storage.from(AUDIO_BUCKET).download(recording.storage_path as string);
      if (downloadError || !fileData) throw new Error("MEETING_AUDIO_DOWNLOAD_FAILED");
      const file = new File([await fileData.arrayBuffer()], recording.original_filename || "meeting.webm", { type: recording.mime_type || "audio/webm" });
      transcript = await transcribeProfessorAudio(file);
    }
    const analysisResult = await analyzeMeetingTranscript({ transcript, meetingContext: { meetingAt: meeting.meeting_at }, priorAdvisorSignals: [] });
    const analysis = trimAnalysis(analysisResult.analysis);
    const { data: intelligence, error: upsertError } = await input.supabase.from("meeting_intelligence").upsert({
      id: existing.data?.id ?? undefined,
      meeting_id: meeting.id,
      recording_id: recording.id,
      student_user_id: input.userId,
      transcript_text: transcript,
      analysis,
      status: "draft",
    }, { onConflict: "recording_id" }).select("id").single();
    if (upsertError || !intelligence) throw new Error("MEETING_INTELLIGENCE_SAVE_FAILED");
    if (recording.storage_path) {
      await createV2AdminClient().storage.from(AUDIO_BUCKET).remove([recording.storage_path as string]);
    }
    await input.supabase.from("meeting_recordings").update({ status: "ready", provider: "groq", provider_model: analysisResult.providerModel, storage_path: null, raw_audio_deleted_at: new Date().toISOString(), error_code: null }).eq("id", recording.id);
    return { ok: true as const, intelligenceId: intelligence.id as string, analysis };
  } catch (error) {
    const message = providerMessage(error);
    if (transcript) {
      await input.supabase.from("meeting_intelligence").upsert({
        id: existing.data?.id ?? undefined,
        meeting_id: meeting.id,
        recording_id: recording.id,
        student_user_id: input.userId,
        transcript_text: transcript,
        analysis: null,
        status: "draft",
      }, { onConflict: "recording_id" });
    }
    await input.supabase.from("meeting_recordings").update({ status: "failed", error_code: error instanceof Error ? error.message.slice(0, 120) : "PROCESSING_FAILED" }).eq("id", recording.id);
    return { ok: false as const, message };
  }
}

export function parseAnalysis(value: unknown) {
  return isMeetingIntelligenceAnalysis(value) ? trimAnalysis(value) : null;
}
