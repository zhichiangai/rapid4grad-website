import type {
  AiModel,
  InstructionType,
  MaterialType,
  MeetingContext,
  PainPoint,
  ResearchConcern,
  ResearchTask,
  StudentStage,
} from "@/lib/prompt-builder/types";

export const RESEARCH_TASK_OPTIONS: Array<{
  value: ResearchTask;
  label: string;
  description: string;
}> = [
  { value: "meeting", label: "明天要 Meeting", description: "預測教授可能追問的問題，提前找出研究漏洞。" },
  { value: "defense", label: "準備口試", description: "用口試委員角度壓力測試你的研究。" },
  { value: "submission", label: "投稿前檢查", description: "檢查研究邏輯、圖表、結果與貢獻是否一致。" },
  { value: "presentation", label: "修改研究簡報", description: "改善簡報故事線、圖表與報告邏輯。" },
  { value: "draft", label: "修改論文 / 草稿", description: "檢查論證、章節結構與文字表達。" },
];

export const MATERIAL_TYPE_OPTIONS: Array<{
  value: MaterialType;
  label: string;
}> = [
  { value: "slides", label: "研究簡報 / PPT" },
  { value: "draft", label: "論文 / 草稿" },
  { value: "figures", label: "實驗結果 / 圖表" },
  { value: "idea", label: "研究想法" },
  { value: "progress", label: "Meeting 進度" },
  { value: "abstract", label: "摘要 / Abstract" },
  { value: "unknown", label: "還不知道" },
];

export const RESEARCH_CONCERN_OPTIONS: Array<{
  value: ResearchConcern;
  label: string;
}> = [
  { value: "motivation", label: "研究動機不夠清楚" },
  { value: "gap", label: "Novelty / Gap 不明確" },
  { value: "method", label: "實驗設計可能有漏洞" },
  { value: "control", label: "對照組不足" },
  { value: "figure", label: "圖表解釋不合理" },
  { value: "overclaim", label: "結論可能過度延伸" },
  { value: "advisor_questions", label: "教授會一直追問" },
  { value: "progress", label: "研究進度說不清楚" },
  { value: "all", label: "不知道，全部幫我檢查" },
];

export const TASK_PRESETS: Record<ResearchTask, {
  meetingContext: MeetingContext;
  painPoints: PainPoint[];
  instructionTypes: InstructionType[];
}> = {
  meeting: {
    meetingContext: "one_on_one",
    painPoints: ["logic_check", "advisor_simulation"],
    instructionTypes: ["advisor_questions", "logic_check"],
  },
  defense: {
    meetingContext: "defense_rehearsal",
    painPoints: ["logic_check", "advisor_simulation", "figure_check"],
    instructionTypes: ["advisor_questions", "logic_check"],
  },
  submission: {
    meetingContext: "submission_check",
    painPoints: ["find_gap", "logic_check", "figure_check"],
    instructionTypes: ["logic_check"],
  },
  logic: {
    meetingContext: "other",
    painPoints: ["logic_check", "find_gap"],
    instructionTypes: ["logic_check"],
  },
  presentation: {
    meetingContext: "group_meeting",
    painPoints: ["presentation_revision", "figure_check"],
    instructionTypes: ["presentation_revision"],
  },
  draft: {
    meetingContext: "draft_revision",
    painPoints: ["logic_check", "english_polish"],
    instructionTypes: ["logic_check", "english_polish"],
  },
  other: {
    meetingContext: "other",
    painPoints: ["logic_check"],
    instructionTypes: ["logic_check"],
  },
};

export const CONCERN_TO_PAIN_POINTS: Record<ResearchConcern, PainPoint[]> = {
  motivation: ["logic_check"],
  gap: ["find_gap"],
  method: ["logic_check"],
  control: ["logic_check"],
  figure: ["figure_check"],
  overclaim: ["logic_check"],
  advisor_questions: ["advisor_simulation"],
  progress: ["logic_check"],
  all: ["find_gap", "logic_check", "advisor_simulation", "figure_check"],
};

export const STUDENT_STAGE_OPTIONS: Array<{
  value: StudentStage;
  label: string;
  description: string;
}> = [
  { value: "master_1", label: "碩一新生", description: "剛進實驗室，正在適應研究節奏與修課壓力。" },
  { value: "master_2", label: "碩二衝刺生", description: "正在準備把題目、實驗與論文收斂成畢業成果。" },
  { value: "master_3_plus", label: "碩三以上", description: "延畢邊緣，需要快速找出卡住的關鍵原因。" },
  { value: "phd", label: "博士班", description: "需要更嚴謹地處理研究貢獻、方法與論證鏈。" },
  { value: "part_time", label: "在職專班", description: "時間碎片化，需要提高 Meeting 與文件修改效率。" },
];

export const MEETING_CONTEXT_OPTIONS: Array<{
  value: MeetingContext;
  label: string;
  description: string;
}> = [
  { value: "one_on_one", label: "一對一指導教授會議", description: "預先模擬教授會追問的問題與邏輯漏洞。" },
  { value: "group_meeting", label: "實驗室進度組會", description: "整理週報、進度簡報與同儕/老師可能追問。" },
  { value: "defense_rehearsal", label: "口試前預演", description: "用口委視角檢查研究貢獻、方法與限制。" },
  { value: "submission_check", label: "投稿前檢查", description: "確認摘要、圖表、結果與貢獻宣稱是否一致。" },
  { value: "draft_revision", label: "論文初稿修改", description: "針對章節邏輯、英文與段落結構做審查。" },
  { value: "other", label: "其他研究討論", description: "適合特殊會議或臨時研究材料檢查。" },
];

export const PAIN_POINT_OPTIONS: Array<{
  value: PainPoint;
  label: string;
  description: string;
}> = [
  { value: "find_gap", label: "找出研究缺口 Gap", description: "讓 AI 幫你檢查前人研究差異與題目價值。" },
  { value: "logic_check", label: "檢查研究邏輯漏洞", description: "檢查研究問題、方法、結果與結論是否斷裂。" },
  { value: "advisor_simulation", label: "模擬教授追問", description: "預測 Meeting、組會或口試中最可能被問的問題。" },
  { value: "presentation_revision", label: "簡報架構修改", description: "改善投影片主線、資訊密度與圖表說服力。" },
  { value: "english_polish", label: "學術英文句型修飾", description: "讓摘要、投影片與論文文字更精準正式。" },
  { value: "figure_check", label: "圖表是否支撐結論", description: "檢查 figure、table 與結論是否互相支持。" },
  { value: "other", label: "其他學術需求", description: "保留彈性，下一輪可加入自訂輸入欄位。" },
];

export const AI_MODEL_OPTIONS: Array<{
  value: AiModel;
  label: string;
  badge: string;
  description: string;
}> = [
  { value: "chatgpt", label: "ChatGPT", badge: "結構化", description: "適合清楚條列、表格、步驟化建議。" },
  { value: "claude", label: "Claude", badge: "深度推理", description: "適合長文脈絡、論證鏈與完整推理。" },
  { value: "gemini", label: "Gemini", badge: "多模態", description: "適合圖表、PDF、簡報視覺內容檢查。" },
  { value: "grok", label: "Grok", badge: "犀利反問", description: "適合反方挑戰、尖銳追問與弱點檢查。" },
];

export const INSTRUCTION_TYPE_OPTIONS: Array<{
  value: InstructionType;
  label: string;
  description: string;
}> = [
  { value: "advisor_questions", label: "教授追問", description: "模擬教授、組會老師或口委可能追問。" },
  { value: "logic_check", label: "邏輯稽核", description: "檢查研究動機、方法、結果與結論一致性。" },
  { value: "presentation_revision", label: "簡報修改", description: "改善投影片架構、圖表呈現與報告順序。" },
  { value: "english_polish", label: "英文潤飾", description: "改寫摘要、投影片或論文章節的學術英文。" },
];

export function toggleValue<T extends string>(current: T[], value: T) {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}
