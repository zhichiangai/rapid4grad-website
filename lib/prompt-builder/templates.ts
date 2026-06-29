import type {
  AiModel,
  InstructionType,
  MeetingContext,
  PainPoint,
  PromptParams,
  PromptTemplate,
  PromptTemplateBuildResult,
  StudentStage,
} from "./types";

export const STAGE_LABELS: Record<StudentStage, string> = {
  master_1: "碩一新生",
  master_2: "碩二衝刺生",
  master_3_plus: "碩三以上（延畢邊緣）",
  phd: "博士班研究生",
  part_time: "在職專班研究生",
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

export function joinLabels<T extends string>(
  values: T[],
  labels: Record<T, string>,
) {
  return values.length
    ? values.map((value) => labels[value]).join("、")
    : "尚未指定";
}

export function buildAdvisorPrefsSection(prefs?: PromptParams["advisorPrefs"]) {
  if (!prefs) return "未提供特定指導教授偏好。";

  const parts: string[] = [];

  if (prefs.frequentQuestions?.length) {
    parts.push(`指導教授常問問題：${prefs.frequentQuestions.join("；")}`);
  }

  if (prefs.preferredStyle?.trim()) {
    parts.push(`教授偏好風格：${prefs.preferredStyle.trim()}`);
  }

  if (prefs.customNote?.trim()) {
    parts.push(`其他自訂備忘：${prefs.customNote.trim()}`);
  }

  return parts.length ? parts.join("\n") : "未提供特定指導教授偏好。";
}

function replaceTemplateVariables(template: string, params: PromptParams) {
  const advisorPrefsSection = buildAdvisorPrefsSection(params.advisorPrefs);
  const replacements: Record<string, string> = {
    student_stage: STAGE_LABELS[params.studentStage],
    meeting_context: CONTEXT_LABELS[params.meetingContext],
    pain_points: joinLabels(params.painPoints, PAIN_POINT_LABELS),
    selected_ai: AI_DISPLAY_NAMES[params.selectedAi],
    instruction_types: joinLabels(
      params.instructionTypes,
      INSTRUCTION_TYPE_LABELS,
    ),
    advisor_prefs_section: advisorPrefsSection,
    advisor_preferences: advisorPrefsSection,
    language_preference: "繁體中文",
  };

  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
    return replacements[key] ?? match;
  });
}

function findTemplate({
  templates,
  selectedAi,
  instructionType,
}: {
  templates: PromptTemplate[];
  selectedAi: AiModel;
  instructionType: InstructionType;
}) {
  return (
    templates.find(
      (template) =>
        template.targetAi === selectedAi &&
        template.templateType === instructionType,
    ) ??
    templates.find(
      (template) =>
        template.targetAi === "all" &&
        template.templateType === instructionType,
    )
  );
}

export function buildPromptFromTemplates({
  params,
  templates,
}: {
  params: PromptParams;
  templates: PromptTemplate[];
}): PromptTemplateBuildResult {
  if (!templates.length) {
    return {
      prompt: "",
      usedCmsTemplates: false,
      fallbackReason: "active prompt_templates is empty",
    };
  }

  const selectedTemplates = params.instructionTypes.map((instructionType) =>
    findTemplate({
      templates,
      selectedAi: params.selectedAi,
      instructionType,
    }),
  );

  if (selectedTemplates.some((template) => !template)) {
    return {
      prompt: "",
      usedCmsTemplates: false,
      fallbackReason:
        "active prompt_templates does not cover every selected instruction type",
    };
  }

  const concreteTemplates = selectedTemplates as PromptTemplate[];
  const aiName = AI_DISPLAY_NAMES[params.selectedAi];
  const title = joinLabels(params.instructionTypes, INSTRUCTION_TYPE_LABELS);
  const versions = concreteTemplates
    .map(
      (template) =>
        `${template.targetAi}/${template.templateType}: v${template.version}`,
    )
    .join("；");

  const roleSection = concreteTemplates
    .map((template) => replaceTemplateVariables(template.systemRole, params))
    .join("\n\n");
  const contextSection = concreteTemplates
    .map((template) =>
      replaceTemplateVariables(template.contextTemplate, params),
    )
    .join("\n\n");
  const taskSection = concreteTemplates
    .map((template, index) => {
      const label = INSTRUCTION_TYPE_LABELS[template.templateType];
      return `### ${index + 1}. ${label}\n${replaceTemplateVariables(
        template.taskTemplate,
        params,
      )}`;
    })
    .join("\n\n");
  const outputSection = concreteTemplates
    .map((template, index) => {
      const label = INSTRUCTION_TYPE_LABELS[template.templateType];
      return `### ${index + 1}. ${label}\n${replaceTemplateVariables(
        template.outputTemplate,
        params,
      )}`;
    })
    .join("\n\n");
  const officialDocNotes = concreteTemplates
    .map((template) => template.officialDocNotes?.trim())
    .filter(Boolean)
    .join("\n");

  return {
    usedCmsTemplates: true,
    prompt: `
【RAPID 學術 AI 指令｜${title}】

## Role
${roleSection}

## Context
${contextSection}

## Task
${taskSection}

## Output
${outputSection}

## Official Model Notes
${officialDocNotes || "本模板未提供額外官方文件備註。"}

## Template Source
CMS prompt_templates：${versions}

請避免只給籠統建議。請盡量指出「哪一段、哪一頁、哪一個圖表、哪一個論證」需要修改。如果無法定位，請明確說明你需要我補充什麼資訊。

[請將上述指令複製，並連同你的論文/簡報 PDF 檔案，一起上傳至 ${aiName} 中進行分析]
`.trim(),
  };
}
