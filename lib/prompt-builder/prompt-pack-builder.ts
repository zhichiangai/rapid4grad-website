import type { MaterialType, ResearchConcern, ResearchTask, StudentStage } from "./types";
import {
  PLATFORM_LABELS,
  PLATFORM_SETUP,
  PLATFORM_STYLES,
  PLATFORM_TIPS,
  RECOMMENDATION_REASONS,
  STEP_LABELS,
  TASK_LABELS_V3,
  getRecommendedPlatform,
} from "./prompt-pack-config";
import type { PlatformPromptPack, PromptPackInput, PromptPackResult, PromptPackStepId, PromptPlatform } from "./prompt-pack-types";

const PLATFORMS: PromptPlatform[] = ["chatgpt", "claude", "gemini", "grok"];
const STEP_IDS: PromptPackStepId[] = ["understand", "audit", "challenge", "improve", "finish"];

const MATERIAL_LABELS: Record<MaterialType, string> = {
  slides: "研究簡報 / PPT",
  draft: "論文 / 草稿",
  figures: "實驗結果 / 圖表",
  idea: "研究想法",
  progress: "Meeting 進度",
  abstract: "摘要 / Abstract",
  unknown: "尚未指定",
};

const STAGE_LABELS: Record<StudentStage, string> = {
  master_1: "碩一新生",
  master_2: "碩二衝刺生",
  master_3_plus: "碩三以上",
  phd: "博士班",
  part_time: "在職專班",
};

const CONCERN_LABELS: Record<ResearchConcern, string> = {
  motivation: "研究動機",
  gap: "研究缺口與 Novelty",
  method: "方法與實驗設計",
  control: "對照組",
  figure: "圖表解釋",
  overclaim: "過度延伸結論",
  advisor_questions: "教授追問",
  progress: "研究進度",
  all: "全部風險",
};

function contextBlock(input: PromptPackInput) {
  const context = input.userContext?.trim();
  const stage = input.studentStage ? `\n研究階段：${STAGE_LABELS[input.studentStage]}` : "";
  const concerns = input.concerns.length ? input.concerns.map((item) => CONCERN_LABELS[item]).join("、") : "未指定，請自行找出關鍵風險";
  const prefs = input.advisorPrefs;
  const preferenceLines = [
    ...(prefs?.frequentQuestions ?? []).map((item) => `- 教授常問：${item}`),
    prefs?.preferredStyle ? `- 教授偏好風格：${prefs.preferredStyle}` : "",
    prefs?.customNote ? `- 其他備忘：${prefs.customNote}` : "",
  ].filter(Boolean).join("\n") || "未提供教授偏好，請用一般嚴謹學術審查標準。";
  return `研究任務：${TASK_LABELS_V3[input.researchTask]}\n研究材料：${MATERIAL_LABELS[input.materialType]}${stage}\n核心關注：${concerns}\n\n【我的補充情境】\n${context || "未提供額外情境。\n請根據我提供的研究材料判斷；\n如果資訊不足，先指出缺少哪些資訊，不要自行猜測。"}\n\n【指導教授偏好】\n${preferenceLines}`;
}

function taskDepth(task: ResearchTask, step: PromptPackStepId) {
  const depth: Record<ResearchTask, Record<PromptPackStepId, string>> = {
    meeting: {
      understand: "建立研究問題、假說、方法、對照組、結果、圖表、解釋與結論地圖。",
      audit: "逐項檢查 Research question、Hypothesis、Method、Control、Result、Figure、Interpretation、Conclusion，找出 3-5 個最危險問題。",
      challenge: "至少提出 10 個教授可能追問，分 High、Medium、Low，優先納入教授偏好。",
      improve: "針對高風險問題提供回答策略、不能宣稱的內容、證據不足時的誠實回答與缺少證據清單。",
      finish: "整理 30 分鐘 Must Fix、Should Fix、Can Ignore，並提供 60 秒開場說法。",
    },
    defense: {
      understand: "建立 Novelty、Method validity、Control、Statistics、Evidence、Overclaim、Limitation、Contribution 地圖。",
      audit: "逐項稽核 Novelty、方法有效性、對照組、統計、證據、過度宣稱、限制與貢獻。",
      challenge: "提出至少 20 個口委問題，分類 Fundamental、Method、Result、Interpretation、Contribution、Limitation。",
      improve: "一次只提出一個委員問題，等待我的回答後再繼續，不要一次替我寫完整口試對話。",
      finish: "整理口試前 Critical、Important、Optional 三層準備清單與不足證據。",
    },
    submission: {
      understand: "建立 Manuscript Map：Research Question、Gap、Method、Key Results、Main Claim、Contribution。",
      audit: "建立 Claim-Evidence Matrix，欄位為 Claim、Evidence、Evidence Location、Strength、Risk、Recommended Fix。",
      challenge: "檢查 Figure、Table、Caption、Text、Conclusion 是否一致，指出互相衝突的位置。",
      improve: "以 Reviewer #2 角度提出至少 10 個 Major/Minor concerns，並逐項給可執行修正。",
      finish: "整理投稿前 Critical、Important、Optional polishing 三層清單。",
    },
    draft: {
      understand: "建立 Argument Map：Motivation、Gap、Research Question、Method、Result、Conclusion、Contribution。",
      audit: "找出 unsupported claim、missing evidence、logical jump、repeated argument、weak transition、overclaim。",
      challenge: "逐 Section 審查，不要把全文重寫；指出最可能被教授或審稿人追問的段落。",
      improve: "以 Original、Revised、Reason 格式提出修正，保留原意，不得捏造新結論。",
      finish: "整理論文修改的優先順序與下一個可在 30 分鐘內完成的工作。",
    },
    presentation: {
      understand: "建立 Slide Story Map：Purpose、Key Message、Connection to next slide。",
      audit: "檢查每張圖的 Axis、Legend、Units、Caption、Trend、Comparison、Statistical indication、Conclusion support。",
      challenge: "逐頁列出 Keep、Change、Remove、Add 與理由，找出故事線失焦處。",
      improve: "為每頁提供 20-60 秒口語稿，不要只是照讀投影片。",
      finish: "提出至少 10 個教授問題，包含 Why asked、Risk、Answer strategy。",
    },
    logic: {
      understand: "整理研究問題、動機、缺口、方法、結果、結論與貢獻的因果鏈。",
      audit: "逐項檢查證據是否足以支撐每個主張，標記邏輯跳躍與資訊缺口。",
      challenge: "提出審查者最可能攻擊的問題並按風險排序。",
      improve: "提出不改變研究事實的論證與段落修正。",
      finish: "整理最小可行修正清單與後續驗證順序。",
    },
    other: {
      understand: "先從材料中辨識研究問題、核心主張、證據與尚未定義的背景。",
      audit: "對研究設計、邏輯、證據、圖表與結論做完整風險掃描。",
      challenge: "提出不同角色可能提出的關鍵問題並標示優先順序。",
      improve: "將問題轉成具體、可驗證且不捏造資料的改善建議。",
      finish: "整理下一步行動、需要補充的資訊與暫時不能下的結論。",
    },
  };
  return depth[task][step];
}

function platformRules(platform: PromptPlatform) {
  if (platform === "chatgpt") return "使用 Markdown 標題、檢查清單、證據位置表格與優先級；challenge 階段一次問一題並等待回答。";
  if (platform === "claude") return "使用 <context>、<task>、<evidence_rules>、<output_format> 區段；先列 evidence，再做推論；不要要求或輸出隱藏 chain of thought。";
  if (platform === "gemini") return "先輸出 File Map，再檢視文字、PDF、簡報、figure、table、caption 與視覺趨勢；不可只做 OCR，要做跨檔案一致性檢查。";
  return "採用反方壓力測試；每項問題標記 A 直接證據、B 推論、C 未支持、D 攻擊點、E 修正；語氣專業直接，不要無禮。";
}

function sharedRules() {
  return "不得捏造資料、實驗或結果；清楚區分事實與推論；明確指出缺少資訊；引用 Page/Figure/Table/Section 位置；依重要性排序；建議必須可執行；使用繁體中文並保留必要學術英文；直接指出證據與結論衝突。";
}

function buildStepPrompt(input: PromptPackInput, platform: PromptPlatform, step: PromptPackStepId) {
  const stepInfo = STEP_LABELS[step];
  return `${platform === "claude" ? "<context>" : "# Role"}\n你是 ${PLATFORM_LABELS[platform]} 上的 RAPID Research Copilot，負責嚴謹的學術研究檢查。\n${platform === "claude" ? "</context>" : ""}\n\n${platform === "claude" ? "<task>" : "# Context"}\n${contextBlock(input)}\n\n${platform === "claude" ? "</task>\n<evidence_rules>" : "# Task"}\n目前步驟：${stepInfo.title}。${stepInfo.description}\n${taskDepth(input.researchTask, step)}\n${platformRules(platform)}\n${sharedRules()}\n如果已有前一步分析，請在其基礎上繼續；如果沒有，請直接分析我附上的材料。\n${platform === "claude" ? "</evidence_rules>\n<output_format>" : "# Output"}\n先給結論摘要，再給證據位置、風險等級、推理依據與可執行下一步。資訊不足時建立「待確認事項」而不是猜測。${platform === "claude" ? "\n</output_format>" : ""}`;
}

function buildSetupPrompt(input: PromptPackInput, platform: PromptPlatform) {
  const setup = PLATFORM_SETUP[platform];
  return `你是 ${PLATFORM_LABELS[platform]} 上的 RAPID Research Copilot。\n研究任務：${TASK_LABELS_V3[input.researchTask]}。\n${setup.description}\n${PLATFORM_STYLES[platform]}\n${sharedRules()}\n每次分析都要標出證據位置與資訊缺口，並以繁體中文回答。這是工作設定，不取代後續五段任務 Prompt。`;
}

function buildPlatformPack(input: PromptPackInput, platform: PromptPlatform): PlatformPromptPack {
  const setup = PLATFORM_SETUP[platform];
  return {
    platform,
    setupTitle: setup.title,
    setupDescription: setup.description,
    setupPrompt: buildSetupPrompt(input, platform),
    steps: STEP_IDS.map((id) => ({ ...STEP_LABELS[id], id, prompt: buildStepPrompt(input, platform, id) })),
    tips: PLATFORM_TIPS[platform],
  };
}

export function buildPromptPack(input: PromptPackInput): PromptPackResult {
  const normalized: PromptPackInput = {
    ...input,
    userContext: input.userContext?.trim() || undefined,
    concerns: input.concerns.length ? input.concerns : ["all"],
  };
  const recommendedPlatform = getRecommendedPlatform(normalized.researchTask, normalized.materialType);
  return {
    researchTask: normalized.researchTask,
    recommendedPlatform,
    recommendationReason: RECOMMENDATION_REASONS[recommendedPlatform],
    userContext: normalized.userContext,
    packs: Object.fromEntries(PLATFORMS.map((platform) => [platform, buildPlatformPack(normalized, platform)])) as PromptPackResult["packs"],
  };
}
