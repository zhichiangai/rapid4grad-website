import type { AdvisorPrefs, MaterialType, ResearchConcern, ResearchTask, StudentStage } from "./types";

export type PromptPlatform = "chatgpt" | "claude" | "gemini" | "grok";
export type PromptPackStepId = "understand" | "audit" | "challenge" | "improve" | "finish";

export interface PromptPackStep {
  id: PromptPackStepId;
  title: string;
  description: string;
  prompt: string;
}

export interface PlatformTip {
  title: string;
  content: string;
}

export interface PlatformPromptPack {
  platform: PromptPlatform;
  setupTitle: string;
  setupDescription: string;
  setupPrompt: string;
  steps: PromptPackStep[];
  tips: PlatformTip[];
}

export interface PromptPackResult {
  researchTask: ResearchTask;
  recommendedPlatform: PromptPlatform;
  recommendationReason: string;
  userContext?: string;
  packs: Record<PromptPlatform, PlatformPromptPack>;
}

export interface PromptPackInput {
  researchTask: ResearchTask;
  materialType: MaterialType;
  concerns: ResearchConcern[];
  studentStage?: StudentStage;
  userContext?: string;
  advisorPrefs?: AdvisorPrefs;
}
