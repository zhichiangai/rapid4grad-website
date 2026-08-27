export type InteractionMode = "chat" | "agent";
export type AgentPlatform = "codex" | "claude_code" | "cursor" | "github_copilot" | "opencode";
export type AgentTask = "literature" | "paper" | "data" | "figure" | "slides" | "experiment" | "coding" | "reproducibility";

export interface ApprovedSkillReference {
  id: string;
  displayName: string;
  description: string;
  repository: string;
  path: string;
  commitSha: string;
  license: string;
  reviewedAt: string;
  supportedTasks: AgentTask[];
}

export interface AgentPromptPack {
  platform: AgentPlatform;
  task: AgentTask;
  recommended: boolean;
  skills: ApprovedSkillReference[];
  fullPrompt: string;
  skillBootstrapPrompt: string;
  taskPrompt: string;
}

export interface AgentPackResult {
  task: AgentTask;
  recommendedPlatform: AgentPlatform;
  recommendationReason: string;
  packs: Record<AgentPlatform, AgentPromptPack>;
}

export interface AgentPackInput {
  task: AgentTask;
  agentContext?: string;
  workingPath?: string;
  constraints?: string;
}
