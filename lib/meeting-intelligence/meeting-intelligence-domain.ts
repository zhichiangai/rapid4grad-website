export type MeetingIntelligenceStatus = "draft" | "confirmed" | "discarded";
export type MeetingRecordingStatus = "uploading" | "queued" | "transcribing" | "analyzing" | "ready" | "failed";

export type MeetingActionProposal = {
  title: string;
  ownerType: "student" | "supervisor" | "unspecified";
  dueDate: string | null;
  dueDateReason: string | null;
  sourceText: string;
};

export type MeetingIntelligenceAnalysis = {
  summary: string;
  professorInstructions: string[];
  decisions: string[];
  blockers: string[];
  openQuestions: string[];
  suggestedActions: MeetingActionProposal[];
  advisorSignals: string[];
};

export function isMeetingIntelligenceAnalysis(value: unknown): value is MeetingIntelligenceAnalysis {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.summary !== "string") return false;
  for (const key of ["professorInstructions", "decisions", "blockers", "openQuestions", "advisorSignals"]) {
    if (!Array.isArray(candidate[key]) || candidate[key].some((item) => typeof item !== "string")) return false;
  }
  if (!Array.isArray(candidate.suggestedActions)) return false;
  return candidate.suggestedActions.every((item) => {
    if (!item || typeof item !== "object") return false;
    const action = item as Record<string, unknown>;
    return typeof action.title === "string"
      && ["student", "supervisor", "unspecified"].includes(String(action.ownerType))
      && (action.dueDate === null || typeof action.dueDate === "string")
      && (action.dueDateReason === null || typeof action.dueDateReason === "string")
      && typeof action.sourceText === "string";
  });
}

export function trimAnalysis(value: MeetingIntelligenceAnalysis): MeetingIntelligenceAnalysis {
  const list = (items: string[], max: number) => items.map((item) => item.trim()).filter(Boolean).slice(0, max);
  return {
    summary: value.summary.trim().slice(0, 4000),
    professorInstructions: list(value.professorInstructions, 20),
    decisions: list(value.decisions, 20),
    blockers: list(value.blockers, 20),
    openQuestions: list(value.openQuestions, 20),
    suggestedActions: value.suggestedActions.slice(0, 30).map((action) => ({
      title: action.title.trim().slice(0, 500),
      ownerType: action.ownerType,
      dueDate: action.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(action.dueDate) ? action.dueDate : null,
      dueDateReason: action.dueDateReason?.trim().slice(0, 500) ?? null,
      sourceText: action.sourceText.trim().slice(0, 1000),
    })),
    advisorSignals: list(value.advisorSignals, 20),
  };
}
