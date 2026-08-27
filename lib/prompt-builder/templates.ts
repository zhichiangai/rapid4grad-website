import type {
  AiModel,
  InstructionType,
  MaterialType,
  MeetingContext,
  PainPoint,
  PromptParams,
  PromptTemplate,
  PromptTemplateBuildResult,
  ResearchTask,
  StudentStage,
} from "./types";

export const STAGE_LABELS: Record<StudentStage, string> = {
  master_1: "碩一",
  master_2: "碩二",
  master_3_plus: "碩三以上",
  phd: "博士班",
  part_time: "在職專班",
};

export const TASK_LABELS: Record<ResearchTask, string> = {
  meeting: "Meeting 前準備",
  defense: "口試準備",
  submission: "投稿前檢查",
  logic: "研究邏輯檢查",
  presentation: "研究簡報修改",
  draft: "論文／草稿修改",
  other: "其他研究問題",
};

export const MATERIAL_LABELS: Record<MaterialType, string> = {
  slides: "研究簡報 / PPT",
  draft: "論文 / 草稿",
  figures: "實驗結果 / 圖表",
  idea: "研究想法",
  progress: "Meeting 進度",
  abstract: "摘要 / Abstract",
  unknown: "尚未決定研究材料",
};

export const CONTEXT_LABELS: Record<MeetingContext, string> = {
  one_on_one: "一對一指導教授會議",
  group_meeting: "實驗室進度組會",
  defense_rehearsal: "口試前預演",
  submission_check: "投稿前檢查",
  draft_revision: "論文初稿修改",
  other: "研究討論",
};

export const PAIN_POINT_LABELS: Record<PainPoint, string> = {
  find_gap: "找出研究缺口（Gap）",
  logic_check: "檢查研究邏輯與實驗數據漏洞",
  advisor_simulation: "模擬教授追問",
  presentation_revision: "簡報架構修改",
  english_polish: "學術英文句型修飾",
  figure_check: "檢查圖表說明是否支撐結論",
  other: "其他學術需求",
};

export const AI_DISPLAY_NAMES: Record<AiModel, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  grok: "Grok",
};

export const INSTRUCTION_TYPE_LABELS: Record<InstructionType, string> = {
  advisor_questions: "教授追問版",
  logic_check: "邏輯漏洞檢查版",
  presentation_revision: "簡報修改版",
  english_polish: "英文修飾版",
};

export function joinLabels<T extends string>(values: T[], labels: Record<T, string>) {
  return values.length ? values.map((value) => labels[value]).join("、") : "尚未指定";
}

export function buildAdvisorPrefsSection(prefs?: PromptParams["advisorPrefs"]) {
  if (!prefs) return "未提供特定指導教授偏好。";
  const parts: string[] = [];
  if (prefs.frequentQuestions?.length) parts.push(`教授常問問題：${prefs.frequentQuestions.join("；")}`);
  if (prefs.preferredStyle?.trim()) parts.push(`教授特別在意：${prefs.preferredStyle.trim()}`);
  if (prefs.customNote?.trim()) parts.push(`其他補充：${prefs.customNote.trim()}`);
  return parts.length ? parts.join("\n") : "未提供特定指導教授偏好。";
}

const TASK_TEXT: Record<InstructionType, string> = {
  advisor_questions: "模擬指導教授、組會老師或口試委員可能提出的尖銳問題，並說明每個問題背後想檢查的研究風險。",
  logic_check: "檢查研究動機、文獻缺口、方法設計、數據解讀、結論與貢獻宣稱是否前後一致。",
  presentation_revision: "檢查簡報架構、資訊密度、圖表呈現、故事線與口頭報告順序，提出可以直接修改的建議。",
  english_polish: "針對摘要、投影片文字或論文章節進行學術英文修飾，讓語氣更精準、正式且符合研究脈絡。",
};

function buildTaskText(types: InstructionType[]) {
  return types.map((type, index) => `${index + 1}. ${TASK_TEXT[type]}`).join("\n");
}

function buildOutputText(types: InstructionType[]) {
  const sections = [
    "1. 請使用繁體中文回覆。",
    "2. 先提供 5 行以內的總結。",
    "3. 每一個問題包含：問題描述、為什麼重要、建議修改方式。",
  ];
  if (types.includes("advisor_questions")) sections.push("4. 列出至少 8 個教授可能追問的問題，並標示高、中、低優先級。");
  if (types.includes("logic_check")) sections.push("5. 使用「研究問題 → 方法 → 結果 → 結論」檢查邏輯斷點。");
  if (types.includes("presentation_revision")) sections.push("6. 提供逐頁簡報修改建議，並列出 30 分鐘內可以完成的修改。");
  if (types.includes("english_polish")) sections.push("7. 使用 Original / Revised / Reason 格式呈現英文修改。");
  return sections.join("\n");
}

function buildContextText(params: PromptParams) {
  return `學生階段：${STAGE_LABELS[params.studentStage]}\n研究任務：${TASK_LABELS[params.researchTask]}\n研究材料：${MATERIAL_LABELS[params.materialType]}\n任務情境：${CONTEXT_LABELS[params.meetingContext]}\n主要檢查重點：${joinLabels(params.painPoints, PAIN_POINT_LABELS)}\n\n指導教授偏好：\n${buildAdvisorPrefsSection(params.advisorPrefs)}`;
}

function replaceTemplateVariables(template: string, params: PromptParams, taskText: string, outputText: string) {
  const replacements: Record<string, string> = {
    student_stage: STAGE_LABELS[params.studentStage],
    research_task: TASK_LABELS[params.researchTask],
    material_type: MATERIAL_LABELS[params.materialType],
    meeting_context: CONTEXT_LABELS[params.meetingContext],
    pain_points: joinLabels(params.painPoints, PAIN_POINT_LABELS),
    selected_ai: AI_DISPLAY_NAMES[params.selectedAi],
    instruction_types: joinLabels(params.instructionTypes, INSTRUCTION_TYPE_LABELS),
    advisor_prefs_section: buildAdvisorPrefsSection(params.advisorPrefs),
    advisor_preferences: buildAdvisorPrefsSection(params.advisorPrefs),
    context: buildContextText(params),
    task: taskText,
    output: outputText,
    language_preference: "繁體中文",
  };
  return template.replace(/\{\{?([a-zA-Z0-9_]+)\}?\}/g, (_match, key: string) => replacements[key] ?? "");
}

function findTemplate(templates: PromptTemplate[], selectedAi: AiModel, instructionType: InstructionType) {
  return templates.find((template) => template.targetAi === selectedAi && template.templateType === instructionType) ??
    templates.find((template) => template.targetAi === "all" && template.templateType === instructionType);
}

export function buildPromptFromTemplates({ params, templates }: { params: PromptParams; templates: PromptTemplate[] }): PromptTemplateBuildResult {
  if (!templates.length) return { prompt: "", usedCmsTemplates: false, fallbackReason: "active templates unavailable" };
  const taskText = buildTaskText(params.instructionTypes);
  const outputText = buildOutputText(params.instructionTypes);
  const selectedTemplates = params.instructionTypes.map((type) => findTemplate(templates, params.selectedAi, type));
  if (selectedTemplates.some((template) => !template)) return { prompt: "", usedCmsTemplates: false, fallbackReason: "selected template unavailable" };
  const concreteTemplates = selectedTemplates as PromptTemplate[];
  const roleSection = concreteTemplates.map((template) => replaceTemplateVariables(template.systemRole, params, taskText, outputText)).join("\n\n");
  const contextSection = concreteTemplates.map((template) => replaceTemplateVariables(template.contextTemplate, params, taskText, outputText)).join("\n\n");
  const taskSection = concreteTemplates.map((template, index) => `### ${index + 1}. ${INSTRUCTION_TYPE_LABELS[template.templateType]}\n${replaceTemplateVariables(template.taskTemplate, params, taskText, outputText)}`).join("\n\n");
  const outputSection = concreteTemplates.map((template, index) => `### ${index + 1}. ${INSTRUCTION_TYPE_LABELS[template.templateType]}\n${replaceTemplateVariables(template.outputTemplate, params, taskText, outputText)}`).join("\n\n");
  return {
    usedCmsTemplates: true,
    prompt: `【RAPID 學術 AI 指令｜${joinLabels(params.instructionTypes, INSTRUCTION_TYPE_LABELS)}】\n\n## Role\n${roleSection}\n\n## Context\n${contextSection}\n\n## Task\n${taskSection || taskText}\n\n## Output\n${outputSection || outputText}\n\n請避免只提供籠統建議。請盡量指出具體的段落、頁面、圖表或論證位置。如果目前資訊不足，請先告訴我需要補充哪些材料。\n\n請先閱讀我接下來提供的研究材料，再開始分析。\n\n## External Execution Guide\n[請將上述指令複製，並連同你的論文/簡報 PDF 檔案，一起上傳至 ${AI_DISPLAY_NAMES[params.selectedAi]} 中進行分析]`.trim(),
  };
}
