import type { AgentPlatform, AgentTask } from "./agent-pack-types";

export const AGENT_PLATFORM_LABELS: Record<AgentPlatform, string> = { codex: "Codex", claude_code: "Claude Code", cursor: "Cursor", github_copilot: "GitHub Copilot", opencode: "OpenCode" };
export const AGENT_HOST_CONFIG: Record<AgentPlatform, { ghAgent: string; projectSkillDir: string; instructionFiles: string[] }> = {
  codex: { ghAgent: "codex", projectSkillDir: ".agents/skills", instructionFiles: ["AGENTS.md"] },
  claude_code: { ghAgent: "claude-code", projectSkillDir: ".claude/skills", instructionFiles: ["CLAUDE.md"] },
  cursor: { ghAgent: "cursor", projectSkillDir: ".agents/skills", instructionFiles: ["AGENTS.md", ".cursor/rules"] },
  github_copilot: { ghAgent: "github-copilot", projectSkillDir: ".agents/skills", instructionFiles: [".github/copilot-instructions.md", "AGENTS.md"] },
  opencode: { ghAgent: "opencode", projectSkillDir: ".agents/skills", instructionFiles: ["AGENTS.md", "opencode.json", "opencode.jsonc"] },
};
export const AGENT_TASK_LABELS: Record<AgentTask, string> = { literature: "文獻 / Gap", paper: "論文 / Thesis", data: "數據 / 統計", figure: "Figure / 圖表", slides: "簡報 / 口試", experiment: "實驗設計", coding: "研究程式 / 自動化", reproducibility: "專案整理 / 重現性" };
export const AGENT_TASK_OPTIONS = (Object.keys(AGENT_TASK_LABELS) as AgentTask[]).map((value) => ({ value, label: AGENT_TASK_LABELS[value] }));
export const AGENT_RECOMMENDATIONS: Record<AgentTask, AgentPlatform> = { literature: "claude_code", paper: "claude_code", data: "codex", figure: "codex", slides: "claude_code", experiment: "claude_code", coding: "codex", reproducibility: "codex" };
export const AGENT_RECOMMENDATION_REASONS: Record<AgentPlatform, string> = { codex: "適合程式、Terminal、資料處理、自動化與驗證型任務。", claude_code: "適合長文件、研究材料、論文與多步驟研究工作流。", cursor: "適合在 IDE 中互動式修改研究程式與工具。", github_copilot: "適合 GitHub Repo、Issue、PR 與協作型開發。", opencode: "適合開源、本地模型與可自訂的 Agent 工作流。" };
