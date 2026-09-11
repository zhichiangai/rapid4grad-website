export const PROFESSOR_AI_INTENTS = [
  "get_weekly_attention",
  "prepare_meeting",
  "get_lab_summary",
  "create_student_action",
  "create_lab_milestone",
  "create_lab_resource",
] as const;

export type ProfessorAiIntent = (typeof PROFESSOR_AI_INTENTS)[number];
export type ProfessorAiContextType = "dashboard" | "student" | "lab";
export type ProfessorAiOperationStatus = "proposed" | "confirmed" | "canceled" | "failed" | "expired";

export type ProfessorAiProposal = {
  intent: ProfessorAiIntent;
  title: string;
  explanation: string;
  contextType: ProfessorAiContextType;
  labId: string | null;
  studentId: string | null;
  meetingId: string | null;
  fields: {
    title?: string;
    description?: string;
    targetDate?: string;
    resourceUrl?: string;
    dueDate?: string | null;
    ownerType?: "student" | "supervisor";
  };
};

export function isProfessorAiIntent(value: unknown): value is ProfessorAiIntent {
  return typeof value === "string" && (PROFESSOR_AI_INTENTS as readonly string[]).includes(value);
}

export function isProfessorAiContextType(value: unknown): value is ProfessorAiContextType {
  return value === "dashboard" || value === "student" || value === "lab";
}

export function validateProposal(proposal: ProfessorAiProposal) {
  if (!isProfessorAiIntent(proposal.intent) || !isProfessorAiContextType(proposal.contextType)) return "不支援這個 RAPID AI 指令。";
  if (!proposal.title.trim() || proposal.title.length > 200 || !proposal.explanation.trim() || proposal.explanation.length > 2000) return "RAPID AI proposal 格式不完整。";
  if (!proposal.fields || typeof proposal.fields !== "object") return "RAPID AI proposal 欄位不完整。";
  if (proposal.fields.ownerType && !["student", "supervisor"].includes(proposal.fields.ownerType)) return "RAPID AI proposal 權限欄位無效。";
  if (proposal.intent === "create_student_action" && (!proposal.labId || !proposal.studentId || !proposal.meetingId || !proposal.fields.title)) return "建立 Student Action 需要已完成 Meeting、學生與下一步內容。";
  if (proposal.intent === "create_lab_milestone" && (!proposal.labId || !proposal.fields.title || !proposal.fields.targetDate)) return "建立 Lab Milestone 需要標題與目標日期。";
  if (proposal.intent === "create_lab_resource" && (!proposal.labId || !proposal.fields.title || !proposal.fields.resourceUrl)) return "建立 Lab Resource 需要標題與網址。";
  if (proposal.intent === "create_lab_resource" && proposal.fields.resourceUrl) {
    try {
      const url = new URL(proposal.fields.resourceUrl);
      if (!["http:", "https:"].includes(url.protocol)) return "建立 Lab Resource 需要有效網址。";
    } catch {
      return "建立 Lab Resource 需要有效網址。";
    }
  }
  return null;
}
