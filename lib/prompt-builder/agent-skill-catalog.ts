import type { AgentTask, ApprovedSkillReference } from "./agent-pack-types";

const KDENSE = "K-Dense-AI/scientific-agent-skills";
const KDENSE_SHA = "36d8f13a1e754618794bf42f417884940077b4ae";
const SUPERPOWERS = "obra/superpowers";
const SUPERPOWERS_SHA = "b36e0829c6d0140e93cfef2ca599b1b07d4a7797";
const REVIEWED_AT = "2026-08-28";

function scientific(id: string, displayName: string, description: string, supportedTasks: AgentTask[]): ApprovedSkillReference {
  return { id, displayName, description, repository: KDENSE, path: `skills/${id}`, commitSha: KDENSE_SHA, license: "MIT", reviewedAt: REVIEWED_AT, supportedTasks };
}

export const APPROVED_SKILLS: Record<string, ApprovedSkillReference> = {
  "literature-review": scientific("literature-review", "系統化文獻回顧", "搜尋、整理與建立研究脈絡。", ["literature"]),
  "citation-management": scientific("citation-management", "引用搜尋與驗證", "檢查 DOI、BibTeX 與引用資訊。", ["literature", "paper"]),
  "scientific-writing": scientific("scientific-writing", "科學論文寫作", "維持科學意義的論文撰寫與修訂。", ["paper"]),
  "statistical-analysis": scientific("statistical-analysis", "統計分析", "建立假設檢查、方法選擇與不確定性分析。", ["data"]),
  "scientific-visualization": scientific("scientific-visualization", "科學圖表分析", "檢查圖表、視覺編碼與資料一致性。", ["data", "figure", "slides"]),
  "scientific-slides": scientific("scientific-slides", "研究簡報與口試", "建立研究故事線與簡報檢查。", ["slides"]),
  "experimental-design": scientific("experimental-design", "實驗設計", "規劃變項、控制、混淆因子與分析方案。", ["experiment"]),
  "scientific-brainstorming": scientific("scientific-brainstorming", "研究方向推演", "在不假裝完成實驗的前提下推演研究方向。", ["experiment"]),
  superpowers: { id: "superpowers", displayName: "軟體開發與驗證流程", description: "Inspect、Plan、Implement、Test、Review、Verify 的工程工作流。", repository: SUPERPOWERS, path: ".", commitSha: SUPERPOWERS_SHA, license: "MIT", reviewedAt: REVIEWED_AT, supportedTasks: ["coding", "reproducibility"] },
};

export const AGENT_SKILL_MAPPING: Record<AgentTask, string[]> = {
  literature: ["literature-review", "citation-management"],
  paper: ["scientific-writing", "citation-management"],
  data: ["statistical-analysis", "scientific-visualization"],
  figure: ["scientific-visualization"],
  slides: ["scientific-slides", "scientific-visualization"],
  experiment: ["experimental-design", "scientific-brainstorming"],
  coding: ["superpowers"],
  reproducibility: ["superpowers"],
};

export function getApprovedSkills(task: AgentTask) {
  return AGENT_SKILL_MAPPING[task].map((id) => APPROVED_SKILLS[id]);
}
