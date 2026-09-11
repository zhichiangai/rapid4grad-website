import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveApiUser } from "@/lib/auth/authorization";
import { compileProfessorContext } from "@/lib/professor/ai-context";
import { isProfessorAiContextType } from "@/lib/professor/ai-contract";
import { extractProfessorProposal, GROQ_PRECISION_STT_MODEL, GROQ_STT_MODEL, transcribeProfessorAudio } from "@/lib/professor/groq";
import { persistProfessorProposal } from "@/lib/professor/ai-gateway";

const MONTHLY_SECONDS = 300 * 60;
const MAX_SECONDS = 120;

export async function POST(request: Request) {
  const auth = await getActiveApiUser();
  if ("response" in auth) return auth.response;
  if (auth.context.profile.role !== "professor") return NextResponse.json({ success: false, error: "PROFESSOR_ACCESS_REQUIRED" }, { status: 403 });
  const form = await request.formData();
  const file = form.get("audio");
  const durationSeconds = Number(form.get("durationSeconds"));
  const contextType = form.get("contextType");
  const labValue = form.get("labId");
  const studentValue = form.get("studentId");
  const labId = typeof labValue === "string" ? labValue : null;
  const studentId = typeof studentValue === "string" ? studentValue : null;
  const precision = form.get("precision") === "true";
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ success: false, error: "找不到語音檔案。" }, { status: 400 });
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > MAX_SECONDS) return NextResponse.json({ success: false, error: "單次語音最多 120 秒。" }, { status: 400 });
  if (!isProfessorAiContextType(contextType)) return NextResponse.json({ success: false, error: "請提供有效的 RAPID AI context。" }, { status: 400 });
  const supabase = auth.context.supabase as unknown as SupabaseClient;
  const monthStart = new Date();
  monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const { data: previousOperations } = await supabase.from("ai_operations").select("audio_seconds").eq("user_id", auth.context.user.id).gte("created_at", monthStart.toISOString());
  const usedSeconds = (previousOperations ?? []).reduce((total: number, row: { audio_seconds: number | null }) => total + Number(row.audio_seconds ?? 0), 0);
  if (usedSeconds >= MONTHLY_SECONDS) return NextResponse.json({ success: false, error: "VOICE_QUOTA_EXCEEDED", usedSeconds, monthlySeconds: MONTHLY_SECONDS }, { status: 429 });
  try {
    const transcript = await transcribeProfessorAudio(file, precision ? GROQ_PRECISION_STT_MODEL : GROQ_STT_MODEL);
    const context = await compileProfessorContext({ context: auth.context, contextType, labId, studentId });
    const extracted = await extractProfessorProposal({ message: transcript, context, contextType, labId, studentId });
    const operation = await persistProfessorProposal(auth.context, extracted.proposal, { ...extracted, model: extracted.providerModel, audioSeconds: durationSeconds });
    return NextResponse.json({ success: true, operationId: operation.id, proposal: extracted.proposal, transcript, usedSeconds: usedSeconds + durationSeconds, monthlySeconds: MONTHLY_SECONDS, quotaWarning: usedSeconds + durationSeconds >= MONTHLY_SECONDS * 0.8 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PROFESSOR_VOICE_FAILED";
    if (code === "GROQ_DATA_PROCESSING_APPROVAL_REQUIRED") return NextResponse.json({ success: false, error: "GROQ_DATA_PROCESSING_APPROVAL_REQUIRED" }, { status: 503 });
    if (code === "GROQ_API_KEY_CONFIGURATION_REQUIRED") return NextResponse.json({ success: false, error: "GROQ_API_KEY_CONFIGURATION_REQUIRED" }, { status: 503 });
    console.error("[professor-ai] voice proposal failed", { code });
    return NextResponse.json({ success: false, error: "語音 RAPID AI 暫時無法建立 proposal。" }, { status: 400 });
  }
}
