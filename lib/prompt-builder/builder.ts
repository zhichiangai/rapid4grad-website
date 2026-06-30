import type { AiModel, InstructionType, PromptParams, PromptTemplate } from "./types";
import {
  AI_DISPLAY_NAMES,
  buildAdvisorPrefsSection,
  buildPromptFromTemplates,
  INSTRUCTION_TYPE_LABELS,
  joinLabels,
  PAIN_POINT_LABELS,
  STAGE_LABELS,
  CONTEXT_LABELS,
} from "./templates";

const AI_STRATEGIES: Record<AiModel, { role: string; note: string }> = {
  chatgpt: {
    role: "你是一位嚴謹的學術顧問與論文審查委員，擅長用結構化清單、明確分類與可執行步驟提供建議。",
    note: "請優先使用條列、表格或分段清單，讓學生能快速看到問題、原因與修正方向。",
  },
  claude: {
    role: "你是一位重視深度推理與長文本脈絡的學術顧問，擅長追蹤論文從動機、方法、結果到結論的完整論證鏈。",
    note: "請逐步分析，不要只給表面建議；請保留上下文，指出論證鏈中哪一段最需要補強。",
  },
  gemini: {
    role: "你是一位擅長多模態檢視的學術助理，能同時檢查文字、圖表、表格、簡報頁面與研究結論之間的關聯。",
    note: "請特別留意圖表標題、座標軸、數據趨勢、圖片說明與研究結論是否互相支撐。",
  },
  grok: {
    role: "你是一位犀利但專業的論文反方審查者，擅長用不留情面的方式找出研究漏洞、教授可能追問的問題與口試風險。",
    note: "請直接指出薄弱處，但保持專業目的：幫學生在真正 Meeting 或口試前先發現問題。",
  },
};

function buildTaskSection(types: InstructionType[]) {
  const tasks: Record<InstructionType, string> = {
    advisor_questions:
      "模擬指導教授、組會老師或口試委員可能提出的尖銳問題，並說明每個問題背後想檢查的研究風險。",
    logic_check:
      "檢查研究動機、文獻缺口、方法設計、數據解讀、結論與貢獻宣稱是否前後一致。",
    presentation_revision:
      "檢查簡報架構、每頁資訊密度、圖表呈現、故事線與口頭報告順序，提出可直接修改的建議。",
    english_polish:
      "針對摘要、投影片文字或論文章節進行學術英文修飾，讓語氣更精準、正式且符合研究脈絡。",
  };

  return types.length
    ? types.map((type, index) => `${index + 1}. ${tasks[type]}`).join("\n")
    : "1. 請先整體檢查這份研究材料，找出最影響 Meeting 或畢業進度的三個問題。";
}

function buildOutputSection(types: InstructionType[], model: AiModel) {
  const sections = [
    "請用繁體中文回覆，必要的學術英文修改可保留英文。",
    "請先給出 5 行以內的總結，再進入詳細建議。",
    "每一項問題都要包含：問題描述、為什麼重要、建議修改方式。",
  ];

  if (types.includes("advisor_questions")) {
    sections.push("請列出至少 8 個教授可能追問的問題，並標示優先級。");
  }

  if (types.includes("logic_check")) {
    sections.push("請用「研究問題 → 方法 → 結果 → 結論」的鏈條格式檢查邏輯斷點。");
  }

  if (types.includes("presentation_revision")) {
    sections.push("若內容是簡報，請提供 slide-by-slide 的修改建議與 30 分鐘內可完成的 quick wins。");
  }

  if (types.includes("english_polish")) {
    sections.push("若需要英文修飾，請用 Original / Revised / Reason 的格式呈現。");
  }

  if (model === "claude") {
    sections.push("請在最後補上「最需要深度思考的 3 個根本問題」。");
  }

  if (model === "grok") {
    sections.push("請在最後補上「最可能被教授抓住不放的一個致命問題」，但保持專業語氣。");
  }

  return sections.map((section, index) => `${index + 1}. ${section}`).join("\n");
}

export function buildLocalFallbackPrompt(params: PromptParams): string {
  const {
    studentStage,
    meetingContext,
    painPoints,
    selectedAi,
    instructionTypes,
    advisorPrefs,
  } = params;

  const stageLabel = STAGE_LABELS[studentStage];
  const contextLabel = CONTEXT_LABELS[meetingContext];
  const aiName = AI_DISPLAY_NAMES[selectedAi];
  const instructionText = joinLabels(instructionTypes, INSTRUCTION_TYPE_LABELS);
  const painPointText = joinLabels(painPoints, PAIN_POINT_LABELS);
  const strategy = AI_STRATEGIES[selectedAi];
  const advisorPrefsText = buildAdvisorPrefsSection(advisorPrefs);

  return `
【RAPID 學術 AI 指令｜${instructionText}】

## Role
${strategy.role}

請注意：你的任務不是幫我寫出漂亮但空泛的文字，而是像真正的學術審查者一樣，協助我在 Meeting、組會、口試或投稿前找出最需要補強的地方。

## Context
學生階段：${stageLabel}
任務情境：${contextLabel}
核心痛點 / 需求：${painPointText}
預計使用的外部 AI：${aiName}

指導教授偏好：
${advisorPrefsText}

模型使用策略：
${strategy.note}

## Task
${buildTaskSection(instructionTypes)}

## Output
${buildOutputSection(instructionTypes, selectedAi)}

## Template Source
Local fallback template：CMS active templates 讀取失敗或選定指令類型缺漏時才使用。

請避免只給籠統建議。請盡量指出「哪一段、哪一頁、哪一個圖表、哪一個論證」需要修改。如果無法定位，請明確說明你需要我補充什麼資訊。

[請將上述指令複製，並連同你的論文/簡報 PDF 檔案，一起上傳至 ${aiName} 中進行分析]
`.trim();
}

export function buildPrompt(
  params: PromptParams,
  templates: PromptTemplate[] = [],
) {
  const cmsResult = buildPromptFromTemplates({ params, templates });

  if (cmsResult.usedCmsTemplates) {
    return cmsResult.prompt;
  }

  return buildLocalFallbackPrompt(params);
}
