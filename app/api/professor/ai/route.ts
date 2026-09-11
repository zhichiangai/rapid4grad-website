import { NextResponse } from "next/server";
import { getActiveApiUser } from "@/lib/auth/authorization";
import { compileProfessorContext } from "@/lib/professor/ai-context";
import { extractProfessorProposal } from "@/lib/professor/groq";
import { isProfessorAiContextType } from "@/lib/professor/ai-contract";
import { persistProfessorProposal } from "@/lib/professor/ai-gateway";

export async function POST(request: Request) {
  const auth = await getActiveApiUser();
  if ("response" in auth) return auth.response;
  if (auth.context.profile.role !== "professor") return NextResponse.json({ success: false, error: "PROFESSOR_ACCESS_REQUIRED" }, { status: 403 });
  const payload = await request.json().catch(() => null) as { message?: unknown; contextType?: unknown; labId?: unknown; studentId?: unknown } | null;
  const message = typeof payload?.message === "string" ? payload.message.trim().slice(0, 2000) : "";
  const contextType = payload?.contextType;
  const labId = typeof payload?.labId === "string" ? payload.labId : null;
  const studentId = typeof payload?.studentId === "string" ? payload.studentId : null;
  if (!message || !isProfessorAiContextType(contextType)) return NextResponse.json({ success: false, error: "請提供問題與有效的 RAPID AI context。" }, { status: 400 });
  try {
    const context = await compileProfessorContext({ context: auth.context, contextType, labId, studentId });
    const extracted = await extractProfessorProposal({ message, context, contextType, labId, studentId });
    const operation = await persistProfessorProposal(auth.context, extracted.proposal, { ...extracted, model: extracted.providerModel });
    return NextResponse.json({ success: true, operationId: operation.id, proposal: extracted.proposal, expiresAt: operation.expires_at });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PROFESSOR_AI_FAILED";
    if (code === "GROQ_DATA_PROCESSING_APPROVAL_REQUIRED") return NextResponse.json({ success: false, error: "GROQ_DATA_PROCESSING_APPROVAL_REQUIRED" }, { status: 503 });
    if (code === "GROQ_API_KEY_CONFIGURATION_REQUIRED") return NextResponse.json({ success: false, error: "GROQ_API_KEY_CONFIGURATION_REQUIRED" }, { status: 503 });
    console.error("[professor-ai] proposal failed", { code });
    return NextResponse.json({ success: false, error: "RAPID AI 暫時無法建立 proposal。" }, { status: 400 });
  }
}
