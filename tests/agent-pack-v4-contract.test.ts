import assert from "node:assert/strict";
import { test } from "node:test";
import { AGENT_RECOMMENDATIONS } from "../lib/prompt-builder/agent-pack-config";
import { buildAgentPack } from "../lib/prompt-builder/agent-pack-builder";
import { AGENT_SKILL_MAPPING, APPROVED_SKILLS } from "../lib/prompt-builder/agent-skill-catalog";
import { buildPlatformSkillBootstrap } from "../lib/prompt-builder/agent-skill-adapter";
import type { AgentPlatform, AgentTask } from "../lib/prompt-builder/agent-pack-types";

const tasks: AgentTask[] = ["literature", "paper", "data", "figure", "slides", "experiment", "coding", "reproducibility"];
const platforms: AgentPlatform[] = ["codex", "claude_code", "cursor", "github_copilot", "opencode"];

test("V4 agent pack exposes five approved platforms and bounded skills", () => {
  const result = buildAgentPack({ task: "literature", agentContext: "整理研究缺口", workingPath: "./paper", constraints: "不要覆寫 raw data" });
  assert.deepEqual(Object.keys(result.packs), platforms);
  for (const pack of Object.values(result.packs)) {
    assert.ok(pack.skills.length <= 2);
    assert.ok(pack.fullPrompt.includes("## PHASE 0 — Capability Preflight"));
    assert.ok(pack.fullPrompt.includes("## PHASE 5 — Deliver"));
    assert.ok(pack.fullPrompt.includes("Do not search GitHub for substitutes"));
    assert.doesNotMatch(pack.fullPrompt, /curl\s+[^\n]*\|\s*(sh|bash)|wget\s+[^\n]*\|\s*bash|irm\s+[^\n]*\|\s*iex/i);
  }
  assert.equal(new Set(Object.values(result.packs).map((pack) => pack.fullPrompt)).size, 5);
  assert.equal(new Set(Object.values(result.packs).map((pack) => pack.skillBootstrapPrompt)).size, 5);
});

test("V4 platform adapters use their exact host, paths, and pinned install order", () => {
  const result = buildAgentPack({ task: "literature" });
  const required = ["gh skill list", "gh skill preview", "gh skill install", "--scope project", "--pin", "skills/literature-review", "skills/citation-management"];
  for (const [platform, pack] of Object.entries(result.packs)) {
    for (const phrase of required) assert.ok(pack.skillBootstrapPrompt.includes(phrase), `${platform} missing ${phrase}`);
    assert.ok(pack.skillBootstrapPrompt.indexOf("gh skill preview") < pack.skillBootstrapPrompt.indexOf("gh skill install"));
  }
  assert.match(result.packs.codex.skillBootstrapPrompt, /--agent codex/);
  assert.match(result.packs.codex.skillBootstrapPrompt, /AGENTS\.md/);
  assert.match(result.packs.codex.skillBootstrapPrompt, /\.agents\/skills/);
  assert.match(result.packs.claude_code.skillBootstrapPrompt, /--agent claude-code/);
  assert.match(result.packs.claude_code.skillBootstrapPrompt, /CLAUDE\.md/);
  assert.match(result.packs.claude_code.skillBootstrapPrompt, /\.claude\/skills/);
  assert.match(result.packs.cursor.skillBootstrapPrompt, /--agent cursor/);
  assert.match(result.packs.cursor.skillBootstrapPrompt, /search codebase/);
  assert.match(result.packs.github_copilot.skillBootstrapPrompt, /--agent github-copilot/);
  assert.match(result.packs.github_copilot.skillBootstrapPrompt, /Acceptance Criteria/);
  assert.match(result.packs.opencode.skillBootstrapPrompt, /--agent opencode/);
  assert.match(result.packs.opencode.skillBootstrapPrompt, /native skill/);
  assert.doesNotMatch(Object.values(result.packs).map((pack) => pack.fullPrompt).join("\n"), /--scope user|--force|--all|gh skill update/);
  assert.equal(buildPlatformSkillBootstrap("codex", result.packs.codex.skills).includes("--agent codex"), true);
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
  assert.equal("superpowers" in APPROVED_SKILLS, false);
  assert.deepEqual(AGENT_SKILL_MAPPING.coding, ["test-driven-development", "verification-before-completion"]);
  assert.deepEqual(AGENT_SKILL_MAPPING.reproducibility, ["verification-before-completion"]);
  assert.equal(APPROVED_SKILLS["test-driven-development"].path, "skills/test-driven-development");
  assert.equal(APPROVED_SKILLS["verification-before-completion"].path, "skills/verification-before-completion");
});
