export type AiAuditType =
  | "advisor_questions"
  | "logic_check"
  | "presentation_review"
  | "english_polish"
  | "full_review";

export const AI_AUDIT_TYPES: Record<
  AiAuditType,
  {
    label: string;
    instruction: string;
  }
> = {
  advisor_questions: {
    label: "教授追問模擬",
    instruction:
      "模擬嚴謹指導教授與口試委員，針對研究缺口、方法合理性、對照組、數據解釋與結論外推提出追問。",
  },
  logic_check: {
    label: "研究邏輯漏洞檢查",
    instruction:
      "檢查研究目的、文獻缺口、研究方法、實驗設計、結果與結論是否前後一致，並指出最可能被質疑的邏輯斷點。",
  },
  presentation_review: {
    label: "簡報與組會稽核",
    instruction:
      "以組會報告與口試簡報視角檢查投影片敘事順序、圖表說明、研究價值呈現與聽眾可能卡住的位置。",
  },
  english_polish: {
    label: "學術英文與表述修正",
    instruction:
      "檢查學術英文語氣、句型精準度、摘要或簡報文字是否清楚，並提供可直接採用的改寫方向。",
  },
  full_review: {
    label: "完整預審",
    instruction:
      "整合教授追問、研究邏輯、簡報敘事與學術英文，給出一份可在 Meeting 前使用的完整預審報告。",
  },
};

export function isAiAuditType(value: unknown): value is AiAuditType {
  return (
    value === "advisor_questions" ||
    value === "logic_check" ||
    value === "presentation_review" ||
    value === "english_polish" ||
    value === "full_review"
  );
}

export function buildAuditSystemPrompt() {
  return [
    "你是 RAPID4GRAD 的研究生學術漏洞稽核引擎。",
    "你的角色不是代寫論文，而是以指導教授、組會老師與口試委員的標準，指出研究報告中最可能導致 Meeting 被追問、論文被退回或簡報失焦的問題。",
    "請使用繁體中文回答，必要時可保留英文學術術語。",
    "請避免空泛鼓勵，所有建議都要具體、可執行、可在下一次 Meeting 前完成。",
    "若 PDF 中資訊不足，請明確指出缺少哪些研究資訊，而不是自行編造。",
  ].join("\n");
}

export function buildAuditUserInstruction(input: {
  auditType: AiAuditType;
  filename: string;
}) {
  const auditType = AI_AUDIT_TYPES[input.auditType];

  return [
    `請稽核這份 PDF：${input.filename}`,
    `稽核模式：${auditType.label}`,
    `稽核重點：${auditType.instruction}`,
    "",
    "請用以下固定格式輸出：",
    "",
    "## Summary",
    "用 3-5 句話摘要這份研究報告目前最重要的狀態。",
    "",
    "## Risk Level",
    "只輸出 low、medium、high 三者之一，並用一句話說明原因。",
    "",
    "## Issue Tags",
    "輸出 3-6 個短標籤，用逗號分隔，例如：研究缺口不清楚, 方法邏輯斷裂, 圖表支撐不足。",
    "",
    "## Advisor Questions",
    "列出 5-8 個指導教授最可能追問的問題，按嚴重程度排序。",
    "",
    "## Logic Gaps",
    "列出研究目的、方法、結果、結論之間最需要修正的邏輯斷點。",
    "",
    "## This Week Action Plan",
    "列出本週可以立即執行的 3-5 個行動，並說明每個行動能降低哪一種 Meeting 風險。",
  ].join("\n");
}

export function parseAuditResult(markdown: string) {
  const summaryMatch = markdown.match(
    /## Summary\s+([\s\S]*?)(?=\n## Risk Level|\n##|$)/i,
  );
  const riskMatch = markdown.match(/\b(low|medium|high)\b/i);
  const tagsMatch = markdown.match(
    /## Issue Tags\s+([\s\S]*?)(?=\n## Advisor Questions|\n##|$)/i,
  );

  const summary =
    summaryMatch?.[1]
      ?.trim()
      .replace(/\n{3,}/g, "\n\n")
      .slice(0, 1200) || "AI 稽核已完成，請查看完整報告內容。";
  const riskLevel = (riskMatch?.[1]?.toLowerCase() || "medium") as
    | "low"
    | "medium"
    | "high";
  const issueTags =
    tagsMatch?.[1]
      ?.split(/[,，\n]/)
      .map((tag) => tag.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 8) ?? [];

  return {
    summary,
    riskLevel,
    issueTags,
  };
}
