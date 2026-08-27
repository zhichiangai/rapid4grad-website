import type { AiModel, InstructionType, PromptParams, PromptTemplate, ResearchTask, MaterialType } from "./types";
import { AI_DISPLAY_NAMES, buildAdvisorPrefsSection, buildPromptFromTemplates, CONTEXT_LABELS, INSTRUCTION_TYPE_LABELS, joinLabels, MATERIAL_LABELS, PAIN_POINT_LABELS, STAGE_LABELS, TASK_LABELS } from "./templates";

const AI_STRATEGIES: Record<AiModel, { role: string; note: string }> = {
  chatgpt: { role: "你是一位嚴謹的學術顧問與論文審查委員，擅長用結構化清單、明確分類與可執行步驟提供建議。", note: "請優先使用條列、表格或分段清單，讓學生能快速看到問題、原因與修正方向。" },
  claude: { role: "你是一位重視深度推理與長文本脈絡的學術顧問，擅長追蹤論文從動機、方法、結果到結論的完整論證鏈。", note: "請逐步分析，不要只給表面建議；請保留上下文，指出論證鏈中哪一段最需要補強。" },
  gemini: { role: "你是一位擅長多模態檢視的學術助理，能同時檢查文字、圖表、表格、簡報頁面與研究結論之間的關聯。", note: "請特別留意圖表標題、座標軸、數據趨勢、圖片說明與研究結論是否互相支撐。" },
  grok: { role: "你是一位犀利但專業的論文反方審查者，擅長用不留情面的方式找出研究漏洞、教授可能追問的問題與口試風險。", note: "請直接指出薄弱處，但保持專業目的：幫學生在真正 Meeting 或口試前先發現問題。" },
};

const TASK_TEXT: Record<InstructionType, string> = {
  advisor_questions: "模擬指導教授、組會老師或口試委員可能提出的尖銳問題，並說明每個問題背後想檢查的研究風險。",
  logic_check: "檢查研究動機、文獻缺口、方法設計、數據解讀、結論與貢獻宣稱是否前後一致。",
  presentation_revision: "檢查簡報架構、資訊密度、圖表呈現、故事線與口頭報告順序，提出可以直接修改的建議。",
  english_polish: "針對摘要、投影片文字或論文章節進行學術英文修飾，讓語氣更精準、正式且符合研究脈絡。",
};

function buildTaskSection(types: InstructionType[]) {
  return types.map((type, index) => `${index + 1}. ${TASK_TEXT[type]}`).join("\n");
}

function buildOutputSection(types: InstructionType[]) {
  const sections = ["1. 請使用繁體中文回覆。", "2. 先提供 5 行以內的總結。", "3. 每一個問題包含：問題描述、為什麼重要、建議修改方式。"];
  if (types.includes("advisor_questions")) sections.push("4. 列出至少 8 個教授可能追問的問題，並標示高、中、低優先級。");
  if (types.includes("logic_check")) sections.push("5. 使用「研究問題 → 方法 → 結果 → 結論」檢查邏輯斷點。");
  if (types.includes("presentation_revision")) sections.push("6. 提供逐頁簡報修改建議，並列出 30 分鐘內可以完成的修改。");
  if (types.includes("english_polish")) sections.push("7. 使用 Original / Revised / Reason 格式呈現英文修改。");
  return sections.join("\n");
}

export function getRecommendedAi(task: ResearchTask, materialType: MaterialType): AiModel {
  if (materialType === "slides" || materialType === "figures") return "gemini";
  if (task === "draft") return "claude";
  if (task === "defense") return "grok";
  return "chatgpt";
}

export function buildLocalFallbackPrompt(params: PromptParams): string {
  const strategy = AI_STRATEGIES[params.selectedAi];
  const aiName = AI_DISPLAY_NAMES[params.selectedAi];
  return `【RAPID 學術 AI 指令｜${joinLabels(params.instructionTypes, INSTRUCTION_TYPE_LABELS)}】

## Role
${strategy.role}

## Context
學生階段：${STAGE_LABELS[params.studentStage]}
研究任務：${TASK_LABELS[params.researchTask]}
研究材料：${MATERIAL_LABELS[params.materialType]}
任務情境：${CONTEXT_LABELS[params.meetingContext]}
主要檢查重點：${joinLabels(params.painPoints, PAIN_POINT_LABELS)}

指導教授偏好：
${buildAdvisorPrefsSection(params.advisorPrefs)}

模型使用策略：
${strategy.note}

## Task
${buildTaskSection(params.instructionTypes)}

## Output
${buildOutputSection(params.instructionTypes)}

請避免只提供籠統建議。請盡量指出具體的段落、頁面、圖表或論證位置。如果目前資訊不足，請先告訴我需要補充哪些材料。

請先閱讀我接下來提供的研究材料，再開始分析。

## External Execution Guide
[請將上述指令複製，並連同你的論文/簡報 PDF 檔案，一起上傳至 ${aiName} 中進行分析]`.trim();
}

export function buildPrompt(params: PromptParams, templates: PromptTemplate[] = []) {
  const cmsResult = buildPromptFromTemplates({ params, templates });
  return cmsResult.usedCmsTemplates ? cmsResult.prompt : buildLocalFallbackPrompt(params);
}
