import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActiveUserContext } from "@/lib/auth/authorization";
import { createV2AdminClient } from "@/lib/supabase/server";
import { compileProfessorContext } from "@/lib/professor/ai-context";
import { getLabMutationAccess, planningErrorMessage } from "@/lib/professor/lab-planning";
import { validateProposal, type ProfessorAiProposal } from "@/lib/professor/ai-contract";

function client(context: ActiveUserContext) {
  return context.supabase as unknown as SupabaseClient;
}

export async function persistProfessorProposal(context: ActiveUserContext, proposal: ProfessorAiProposal, usage: { inputTokens?: number | null; outputTokens?: number | null; audioSeconds?: number | null; provider?: string; model?: string } = {}) {
  const error = validateProposal(proposal);
  if (error) throw new Error(error);
  const { data, error: insertError } = await client(context).from("ai_operations").insert({ user_id: context.user.id, lab_id: proposal.labId, context_type: proposal.contextType, context_id: proposal.studentId ?? proposal.labId, intent: proposal.intent, proposal, status: "proposed", provider: usage.provider ?? "groq", model: usage.model ?? "pending", input_tokens: usage.inputTokens ?? null, output_tokens: usage.outputTokens ?? null, audio_seconds: usage.audioSeconds ?? null, cost_estimate_cents: null }).select("id,created_at,expires_at,status").single();
  if (insertError || !data) {
    console.error("[professor-ai] proposal persistence failed", { code: insertError?.code });
    throw new Error("AI proposal 儲存失敗，請稍後再試。");
  }
  return data as { id: string; created_at: string; expires_at: string; status: string };
}

export async function executeProfessorTool(context: ActiveUserContext, proposal: ProfessorAiProposal) {
  const validationError = validateProposal(proposal);
  if (validationError) throw new Error(validationError);
  if (["get_weekly_attention", "prepare_meeting", "get_lab_summary"].includes(proposal.intent)) {
    return { kind: "read" as const, result: await compileProfessorContext({ context, contextType: proposal.contextType, labId: proposal.labId, studentId: proposal.studentId }) };
  }
  if (!proposal.labId) throw new Error("這個操作需要指定 Lab。");
  const access = await getLabMutationAccess(context, proposal.labId);
  if (!access.allowed) throw new Error(planningErrorMessage(access.reason));
  const supabase = client(context);
  if (proposal.intent === "create_student_action") {
    if (!proposal.studentId || !proposal.meetingId || !proposal.fields.title) throw new Error("Student Action proposal 資料不完整。");
    const { data: meeting } = await supabase.from("meetings").select("id,lab_id,student_user_id,status").eq("id", proposal.meetingId).eq("lab_id", proposal.labId).eq("student_user_id", proposal.studentId).maybeSingle();
    if (!meeting || meeting.status !== "completed") throw new Error("Action 必須建立在已完成且已授權的 Lab Meeting 上。");
    const ownerType = proposal.fields.ownerType === "supervisor" ? "supervisor" : "student";
    const { data, error } = await supabase.from("meeting_actions").insert({ meeting_id: proposal.meetingId, lab_id: proposal.labId, student_user_id: proposal.studentId, title: proposal.fields.title, owner_type: ownerType, owner_user_id: ownerType === "supervisor" ? context.user.id : proposal.studentId, due_date: proposal.fields.dueDate || null, status: "todo", completed_at: null }).select("id,title,status,due_date,owner_type").single();
    if (error || !data) throw new Error("Meeting Action 建立失敗，請稍後再試。");
    return { kind: "mutation" as const, result: data };
  }
  if (proposal.intent === "create_lab_milestone") {
    if (!proposal.fields.title || !proposal.fields.targetDate) throw new Error("Milestone proposal 資料不完整。");
    const { data, error } = await supabase.from("lab_milestones").insert({ lab_id: proposal.labId, title: proposal.fields.title, description: proposal.fields.description || null, target_date: proposal.fields.targetDate, status: "active", created_by: context.user.id }).select("id,title,target_date,status").single();
    if (error || !data) throw new Error("Lab Milestone 建立失敗，請稍後再試。");
    return { kind: "mutation" as const, result: data };
  }
  if (proposal.intent === "create_lab_resource") {
    if (!proposal.fields.title || !proposal.fields.resourceUrl) throw new Error("Resource proposal 資料不完整。");
    const { data, error } = await supabase.from("lab_resources").insert({ lab_id: proposal.labId, title: proposal.fields.title, description: proposal.fields.description || null, resource_url: proposal.fields.resourceUrl, created_by: context.user.id }).select("id,title,resource_url,archived_at").single();
    if (error || !data) throw new Error("Lab Resource 建立失敗，請稍後再試。");
    return { kind: "mutation" as const, result: data };
  }
  throw new Error("不支援這個 RAPID AI 操作。");
}

export async function updateProfessorOperation(operationId: string, userId: string, status: "confirmed" | "canceled" | "failed", extra: Record<string, unknown> = {}) {
  const admin = createV2AdminClient() as unknown as SupabaseClient;
  const { error } = await admin.from("ai_operations").update({ status, ...(status === "confirmed" ? { confirmed_at: new Date().toISOString() } : {}), ...(status === "canceled" ? { canceled_at: new Date().toISOString() } : {}), ...extra }).eq("id", operationId).eq("user_id", userId);
  if (error) throw new Error("AI operation 狀態更新失敗，請稍後再試。");
}

export async function claimProfessorOperation(operationId: string, userId: string) {
  const admin = createV2AdminClient() as unknown as SupabaseClient;
  const { data, error } = await admin
    .from("ai_operations")
    .update({ status: "executing" })
    .eq("id", operationId)
    .eq("user_id", userId)
    .eq("status", "proposed")
    .gt("expires_at", new Date().toISOString())
    .select("id")
    .maybeSingle();
  return !error && Boolean(data);
}
