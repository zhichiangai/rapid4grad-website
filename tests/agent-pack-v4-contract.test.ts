import assert from "node:assert/strict";
import { test } from "node:test";
import { AGENT_RECOMMENDATIONS } from "../lib/prompt-builder/agent-pack-config";
import { buildAgentPack } from "../lib/prompt-builder/agent-pack-builder";
import { AGENT_SKILL_MAPPING, APPROVED_SKILLS } from "../lib/prompt-builder/agent-skill-catalog";
import type { AgentPlatform, AgentTask } from "../lib/prompt-builder/agent-pack-types";

const tasks: AgentTask[] = ["literature", "paper", "data", "figure", "slides", "experiment", "coding", "reproducibility"];
const platforms: AgentPlatform[] = ["codex", "claude_code", "cursor", "github_copilot", "opencode"];

test("V4 agent pack exposes five approved platforms and bounded skills", () => {
  const result = buildAgentPack({ task: "literature", agentContext: "整理研究缺口", workingPath: "./paper", constraints: "不要覆寫 raw data" });
  assert.deepEqual(Object.keys(result.packs), platforms);
  for (const pack of Object.values(result.packs)) {
    assert.ok(pack.skills.length <= 2);
    assert.ok(pack.fullPrompt.includes("PHASE 0"));
    assert.ok(pack.fullPrompt.includes("PHASE 5"));
    assert.ok(pack.fullPrompt.includes("Do not search GitHub for substitutes"));
    assert.doesNotMatch(pack.fullPrompt, /curl\s+[^\n]*\|\s*(sh|bash)|wget\s+[^\n]*\|\s*bash|irm\s+[^\n]*\|\s*iex/i);
  }
  assert.ok(new Set(Object.values(result.packs).map((pack) => pack.fullPrompt)).size > 1);
});

test("V4 recommendation and task mapping match the approved catalog", () => {
  for (const task of tasks) {
    const result = buildAgentPack({ task });
    assert.equal(result.recommendedPlatform, AGENT_RECOMMENDATIONS[task]);
    assert.deepEqual(result.packs[result.recommendedPlatform].skills.map((skill) => skill.id), AGENT_SKILL_MAPPING[task]);
  }
  for (const skill of Object.values(APPROVED_SKILLS)) {
    assert.notEqual(skill.repository, "Imbad0202/agent-skills");
    assert.match(skill.commitSha, /^[0-9a-f]{40}$/);
  }
});
