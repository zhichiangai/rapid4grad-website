import { AGENT_PLATFORM_LABELS, AGENT_RECOMMENDATION_REASONS, AGENT_RECOMMENDATIONS } from "./agent-pack-config";
import { getApprovedSkills } from "./agent-skill-catalog";
import type { AgentPackInput, AgentPackResult, AgentPlatform, AgentTask } from "./agent-pack-types";

const PLATFORMS: AgentPlatform[] = ["codex", "claude_code", "cursor", "github_copilot", "opencode"];

const PLATFORM_WORKFLOWS: Record<AgentPlatform, string> = {
  codex: "先讀 AGENTS.md 與 repo instructions，inspect 現況後列出短計畫；用 terminal 完成實作，執行測試、檢查 git diff，最後回報驗證結果。",
  claude_code: "先找 CLAUDE.md 與 .claude/skills，研究任務先整理 evidence 再下結論；程式任務依序讀 repo、載入能力、修改、測試與驗證，不要求 private chain-of-thought。",
  cursor: "先搜尋 codebase、檢查 symbols 與相關檔案，再以 Agent Mode 編輯；使用 terminal 與可用的 review/security review，完成後驗證 diff。",
  github_copilot: "用 Issue / Acceptance Criteria 方式工作，明確列出 Problem、Scope、Expected Behavior、Tests、Do Not Modify 與 Deliverables，最後提供 PR/diff oriented summary。",
  opencode: "先讀 AGENTS.md、OpenCode config 並 discover native skills，再 Plan、Build、Verify；尊重 OpenCode 的 permission boundaries。",
};

const TASK_WORKFLOWS: Record<AgentTask, string> = {
  literature: "定義研究問題、建立搜尋關鍵字、搜尋可靠學術來源、比較方法與結果、建立 Gap Map、驗證 citation；輸出 Literature Map、Evidence Table、Research Gap、Key References、Uncertainty / Missing Evidence。",
  paper: "inspect manuscript，維持原始科學意義，建立 argument map、claim-evidence check、citation verification、section consistency 與 overclaim check；輸出 Changes Made、Remaining Risks、Citation Issues、Next Revision Priorities。",
  data: "先讀 raw data，不覆蓋 raw data；建立 analysis plan、assumption checks、test selection、effect size 與 uncertainty，必要時建立 reproducible script，所有結果標示使用方法。",
  figure: "檢查 axis、unit、legend、caption、uncertainty、missing data、comparison、color readability 與 conclusion consistency；不得以美化改變科學意義。",
  slides: "建立 Slide Story Map，檢查 Research Question、Gap、Method、Result、Figure、Conclusion；可修改 editable presentation，但修改後必須做 visual QA，並產生教授/口委問題。",
  experiment: "建立 Research Question、Hypothesis、Independent Variable、Dependent Variable、Controls、Confounders、Randomization、Replication、Sample Size consideration、Analysis Plan、Failure Criteria；先設計，不假裝完成實驗。",
  coding: "Inspect Repo、Plan、Implement、Test、Debug、Review、Verify；不要擴大 scope，除非使用者明確要求，不要 push 或 deploy。",
  reproducibility: "inventory project、dependencies、environment、entry points、data paths、configs、scripts 與 README，確認 clean environment 可依文件重現，不刪除原始研究數據。",
};

function integrity() { return "不捏造文獻、DOI、數據、實驗或 reference；不把推論寫成事實；資訊不足就標示；分開 evidence 與 interpretation；保留原始資料，不覆蓋 raw data；修改前先確認檔案用途；優先 reproducible workflow；回覆使用繁體中文，專有學術名詞可保留 English。"; }
function skillBootstrap(skills: ReturnType<typeof getApprovedSkills>) { return `Before beginning the actual task, prepare the required RAPID-approved skills.\n\nFor every required skill:\n1. Check whether the exact skill is already installed and discoverable by this agent.\n2. If the approved version is available, do not reinstall it.\n3. If missing, use only the exact approved repository and pinned revision below.\n4. Do not search GitHub for substitutes or install similarly named skills.\n5. Inspect SKILL.md and the skill file tree before installation or execution.\n6. Do not execute bundled scripts merely because they exist.\n7. Prefer project-scoped installation and verify discovery after installation.\n8. If installation is unavailable in this agent surface, continue with this workflow and report that manual installation is needed.\n\nApproved skills:\n${skills.map((skill) => `- ${skill.displayName} (${skill.id}) | ${skill.repository} @ ${skill.commitSha} | ${skill.license} | ${skill.path}`).join("\n")}`; }

function adapter(platform: AgentPlatform, input: AgentPackInput) {
  const skills = getApprovedSkills(input.task);
  const context = input.agentContext?.trim() ? `## User Request\n${input.agentContext.trim()}` : "## User Request\nNo additional context was provided. Inspect the available workspace/files and complete the selected task without inventing missing information.";
  const path = input.workingPath?.trim() ? `\n## Working Path Hint\n${input.workingPath.trim()}` : "";
  const constraints = input.constraints?.trim() ? `\n## Constraints\n${input.constraints.trim()}` : "";
  const bootstrap = skillBootstrap(skills);
  const task = `PHASE 3 — Execute Research Task\n${TASK_WORKFLOWS[input.task]}`;
  const fullPrompt = `# RAPID Agent Task\n\n## Goal\n完成「${input.task}」研究任務，先準備核准能力，再讀取工作區、執行、驗證並交付。\n\n## Approved Skills\n${skills.map((skill) => skill.id).join(", ")}\n\nPHASE 0 — Safety & Capability Preflight\n${PLATFORM_WORKFLOWS[platform]}\n不要把平台名稱當成權限；任何修改、安裝或外部操作都先遵守目前 agent 的 permission boundary。\n\nPHASE 1 — Skill Bootstrap\n${bootstrap}\n\nPHASE 2 — Inspect Workspace\n先確認工作目錄、檔案用途、依賴、設定與現有輸出；不要猜測缺少的資訊。${path}\n\n${task}\n\nPHASE 4 — Verify\n檢查輸出是否符合任務目標，執行可用的測試或重現步驟，檢查檔案差異與敏感資料；研究結果要標出 evidence location、限制與不確定性。\n\nPHASE 5 — Deliver\n回報完成內容、變更檔案、測試結果、Remaining Risks 與下一步；除非使用者明確要求，不要 push 或 deploy。${constraints}\n\n## Research Integrity Rules\n${integrity()}\n\n${context}`;
  const taskPrompt = `PHASE 3 — Execute Research Task\n${TASK_WORKFLOWS[input.task]}${path}${constraints}\n\n${context}`;
  return { platform, task: input.task, recommended: AGENT_RECOMMENDATIONS[input.task] === platform, skills, fullPrompt, skillBootstrapPrompt: bootstrap, taskPrompt };
}

export function buildAgentPack(input: AgentPackInput): AgentPackResult {
  const recommendedPlatform = AGENT_RECOMMENDATIONS[input.task];
  return { task: input.task, recommendedPlatform, recommendationReason: AGENT_RECOMMENDATION_REASONS[recommendedPlatform], packs: Object.fromEntries(PLATFORMS.map((platform) => [platform, adapter(platform, input)])) as AgentPackResult["packs"] };
}

export { AGENT_PLATFORM_LABELS };
