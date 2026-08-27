import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLocalFallbackPrompt,
  getRecommendedAi,
} from "../lib/prompt-builder/builder";
import type { PromptParams } from "../lib/prompt-builder/types";

const params: PromptParams = {
  researchTask: "meeting",
  materialType: "slides",
  studentStage: "master_2",
  meetingContext: "one_on_one",
  painPoints: ["logic_check", "advisor_simulation"],
  selectedAi: "gemini",
  instructionTypes: ["advisor_questions", "logic_check"],
  advisorPrefs: {
    frequentQuestions: ["證據是否足夠？"],
    preferredStyle: "重視邏輯",
    customNote: "請先指出最重要的三個問題。",
  },
};

test("research task fallback prompt is complete and has no unresolved placeholders", () => {
  const prompt = buildLocalFallbackPrompt(params);

  assert.match(prompt, /## Role/);
  assert.match(prompt, /## Context/);
  assert.match(prompt, /研究材料：研究簡報 \/ PPT/);
  assert.match(prompt, /## Task/);
  assert.match(prompt, /## Output/);
  assert.match(prompt, /External Execution Guide/);
  assert.doesNotMatch(prompt, /\{\{?[a-zA-Z0-9_]+\}?\}/);
  assert.doesNotMatch(prompt, /Template Source|Official Model Notes|officialDocNotes/);
});

test("AI recommendation follows research material and task priorities", () => {
  assert.equal(getRecommendedAi("meeting", "slides"), "gemini");
  assert.equal(getRecommendedAi("draft", "draft"), "claude");
  assert.equal(getRecommendedAi("defense", "idea"), "grok");
  assert.equal(getRecommendedAi("logic", "idea"), "chatgpt");
});
