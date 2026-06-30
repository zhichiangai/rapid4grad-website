export type StudentStage =
  | "master_1"
  | "master_2"
  | "master_3_plus"
  | "phd"
  | "part_time";

export type MeetingContext =
  | "one_on_one"
  | "group_meeting"
  | "defense_rehearsal"
  | "submission_check"
  | "draft_revision"
  | "other";

export type PainPoint =
  | "find_gap"
  | "logic_check"
  | "advisor_simulation"
  | "presentation_revision"
  | "english_polish"
  | "figure_check"
  | "other";

export type AiModel = "chatgpt" | "claude" | "gemini" | "grok";

export type PromptTemplateTargetAi = AiModel | "all";

export type InstructionType =
  | "advisor_questions"
  | "logic_check"
  | "presentation_revision"
  | "english_polish";

export interface AdvisorPrefs {
  frequentQuestions?: string[];
  preferredStyle?: string;
  customNote?: string;
}

export interface PromptParams {
  studentStage: StudentStage;
  meetingContext: MeetingContext;
  painPoints: PainPoint[];
  selectedAi: AiModel;
  instructionTypes: InstructionType[];
  advisorPrefs?: AdvisorPrefs;
}

export interface PromptTemplate {
  id: string;
  targetAi: PromptTemplateTargetAi;
  templateType: InstructionType;
  systemRole: string;
  contextTemplate: string;
  taskTemplate: string;
  outputTemplate: string;
  officialDocNotes?: string | null;
  version: number;
}

export interface PromptTemplateBuildResult {
  prompt: string;
  usedCmsTemplates: boolean;
  fallbackReason?: string;
}
