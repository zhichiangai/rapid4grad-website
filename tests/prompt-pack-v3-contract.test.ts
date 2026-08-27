import assert from "node:assert/strict";
import test from "node:test";
import { buildPromptPack } from "../lib/prompt-builder/prompt-pack-builder";
import { getRecommendedPlatform } from "../lib/prompt-builder/prompt-pack-config";

test("V3 generates four platforms and five standalone steps", () => {
  const result = buildPromptPack({
    researchTask: "meeting",
    materialType: "slides",
    concerns: ["method", "figure", "advisor_questions"],
    userContext: "明天要報告，擔心教授追問對照組。",
    advisorPrefs: { preferredStyle: "重視前後邏輯" },
  });
  assert.equal(result.recommendedPlatform, "gemini");
  assert.deepEqual(Object.keys(result.packs).sort(), ["chatgpt", "claude", "gemini", "grok"]);
  for (const pack of Object.values(result.packs)) {
    assert.equal(pack.steps.length, 5);
    for (const step of pack.steps) {
      assert.match(step.prompt, /研究任務：Meeting/);
      assert.match(step.prompt, /我的補充情境/);
      assert.match(step.prompt, /不得捏造資料/);
      assert.match(step.prompt, /證據位置/);
    }
  }
});

test("V3 recommendation follows the fixed task priority", () => {
  assert.equal(getRecommendedPlatform("presentation", "draft"), "gemini");
  assert.equal(getRecommendedPlatform("defense", "slides"), "grok");
  assert.equal(getRecommendedPlatform("submission", "slides"), "claude");
  assert.equal(getRecommendedPlatform("meeting", "idea"), "chatgpt");
});
