import type { PromptPackStepId, PromptPlatform, PlatformTip } from "./prompt-pack-types";
import type { MaterialType, ResearchTask } from "./types";

export const PLATFORM_LABELS: Record<PromptPlatform, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  grok: "Grok",
};

export const STEP_LABELS: Record<PromptPackStepId, { title: string; description: string }> = {
  understand: { title: "先讀懂研究材料", description: "建立研究材料地圖，避免直接跳到結論。" },
  audit: { title: "稽核證據與邏輯", description: "找出研究設計、證據與結論之間的風險。" },
  challenge: { title: "模擬教授追問", description: "從審查者角度提出最需要準備的問題。" },
  improve: { title: "提出可執行修正", description: "把問題轉成有優先順序的修改方案。" },
  finish: { title: "整理下一步", description: "形成可以立即採取的研究行動與回覆策略。" },
};

export const TASK_LABELS_V3: Record<ResearchTask, string> = {
  meeting: "Meeting",
  defense: "口試",
  submission: "投稿",
  draft: "論文",
  presentation: "簡報",
  logic: "研究邏輯",
  other: "其他研究任務",
};

export const PLATFORM_TIPS: Record<PromptPlatform, PlatformTip[]> = {
  chatgpt: [
    { title: "@ 功能", content: "需要引用特定檔案或工具時，可使用 ChatGPT 的 @ 功能指定來源。" },
    { title: "Projects", content: "可把同一研究的材料與多次分析放在 Projects 中，方便延續對話。" },
  ],
  claude: [
    { title: "一般 Claude", content: "直接貼上單段 Prompt 並附上材料即可；需要長文時先確認檔案已完整載入。" },
    { title: "Claude Code", content: "Claude Code、@file、/compact、/skills 屬於另一種工作環境功能，不要混進一般研究 Prompt。" },
  ],
  gemini: [
    { title: "@ Connected Apps", content: "可用 @ Connected Apps 連接需要的來源，再把本 Prompt 作為研究檢查框架。" },
    { title: "Gems", content: "可把固定的研究角色與檢查習慣整理成 Gem，保持多次分析的一致性。" },
  ],
  grok: [
    { title: "Skills / Connectors", content: "需要外部資料時再使用 Skills 或 Connectors；先確認來源與研究材料範圍。" },
    { title: "避免混用斜線指令", content: "不要把 /goal、/workflows、/deep-research 當成一般 Prompt 的必要內容。" },
  ],
};

export const PLATFORM_STYLES: Record<PromptPlatform, string> = {
  chatgpt: "以結構化 Markdown、清單、表格與逐步對話輸出。",
  claude: "以 evidence-first 深度論證、XML-like 區段與完整脈絡輸出，不要求隱藏 chain of thought。",
  gemini: "以多模態檢查為核心，建立 File Map 並同時檢視文字、PDF、簡報、圖表、caption 與視覺趨勢。",
  grok: "以專業而直接的反方壓力測試輸出，將問題分成 A 直接證據、B 推論、C 未支持、D 攻擊點、E 修正。",
};

export const PLATFORM_SETUP: Record<PromptPlatform, { title: string; description: string }> = {
  chatgpt: { title: "ChatGPT 研究工作設定", description: "先建立可重複使用的研究檢查角色與輸出規則。" },
  claude: { title: "Claude 研究工作設定", description: "先指定長篇研究材料的證據優先與論證檢查方式。" },
  gemini: { title: "Gemini 多模態研究設定", description: "先指定檔案、圖表與視覺資訊的交叉檢查方式。" },
  grok: { title: "Grok 反方研究設定", description: "先指定專業、直接且不失禮的反方挑戰方式。" },
};

export function getRecommendedPlatform(task: ResearchTask, material: MaterialType): PromptPlatform {
  if (task === "presentation") return "gemini";
  if (task === "defense") return "grok";
  if (task === "submission" || task === "draft" || task === "logic") return "claude";
  if (task === "meeting" && (material === "slides" || material === "figures")) return "gemini";
  if (task === "meeting") return "chatgpt";
  return "chatgpt";
}

export const RECOMMENDATION_REASONS: Record<PromptPlatform, string> = {
  chatgpt: "適合一般研究整理、結構化檢查與逐步對話。",
  claude: "適合長篇論文、完整論證鏈與 evidence-first 深度分析。",
  gemini: "適合簡報、圖表、PDF 與多模態研究材料交叉檢查。",
  grok: "適合口試前反方挑戰、弱點攻擊與高壓 Q&A。",
};
