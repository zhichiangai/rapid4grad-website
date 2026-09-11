import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveApiUser } from "@/lib/auth/authorization";
import { claimProfessorOperation, executeProfessorTool, updateProfessorOperation } from "@/lib/professor/ai-gateway";
import type { ProfessorAiProposal } from "@/lib/professor/ai-contract";

type Context = { params: Promise<{ operationId: string }> };

export async function POST(request: Request, { params }: Context) {
  const auth = await getActiveApiUser();
  if ("response" in auth) return auth.response;
  if (auth.context.profile.role !== "professor") return NextResponse.json({ success: false, error: "PROFESSOR_ACCESS_REQUIRED" }, { status: 403 });
  const { operationId } = await params;
  const payload = await request.json().catch(() => null) as { proposal?: ProfessorAiProposal } | null;
  const supabase = auth.context.supabase as unknown as SupabaseClient;
  const { data: operation, error } = await supabase.from("ai_operations").select("id,user_id,status,proposal,expires_at").eq("id", operationId).eq("user_id", auth.context.user.id).maybeSingle();
  if (error || !operation || operation.status !== "proposed") return NextResponse.json({ success: false, error: "這個 proposal 不存在或已處理。" }, { status: 400 });
  if (new Date(operation.expires_at).getTime() <= Date.now()) return NextResponse.json({ success: false, error: "這個 proposal 已過期，請重新建立。" }, { status: 400 });
  if (!(await claimProfessorOperation(operationId, auth.context.user.id))) return NextResponse.json({ success: false, error: "這個 proposal 正在處理或已被確認。" }, { status: 409 });
  const proposal = payload?.proposal ?? operation.proposal as ProfessorAiProposal;
  try {
    const result = await executeProfessorTool(auth.context, proposal);
    await updateProfessorOperation(operationId, auth.context.user.id, "confirmed");
    return NextResponse.json({ success: true, result });
  } catch (toolError) {
    const message = toolError instanceof Error ? toolError.message : "RAPID AI 操作失敗。";
    await updateProfessorOperation(operationId, auth.context.user.id, "failed");
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
