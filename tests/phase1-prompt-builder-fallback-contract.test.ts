import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

function readSource(path: string) {
  return readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
}

const publicPage = readSource("../app/ai-command/page.tsx");
const dashboardPage = readSource("../app/dashboard/ai-command/page.tsx");
const container = readSource("../components/ai-command/AiCommandContainer.tsx");
const builder = readSource("../lib/prompt-builder/builder.ts");

test("Phase 1 Prompt Builder keeps public and authenticated entry points", () => {
  assert.match(publicPage, /AiCommandContainer/);
  assert.match(dashboardPage, /AiCommandContainer/);
  assert.match(publicPage, /20 次/);
  assert.match(dashboardPage, /prompt_templates/);
});

test("Prompt Builder uses a 20-use anonymous browser allowance and unlimited verified access", () => {
  const usageRoute = readSource("../app/api/ai-usage/route.ts");

  assert.match(usageRoute, /ANONYMOUS_TRIAL_LIMIT = 20/);
  assert.match(usageRoute, /if \(userId \|\| verifiedSession\)/);
  assert.doesNotMatch(usageRoute, /\.from\("free_usage_quotas"\)/);
  assert.doesNotMatch(usageRoute, /hasPaidToolAccess/);
});

test("Phase 1 Prompt Builder retains local template fallback and external execution", () => {
  assert.match(container, /buildPrompt\(/);
  assert.match(container, /activePromptTemplates/);
  assert.match(container, /buildPrompt\(/);
  assert.match(builder, /buildLocalFallbackPrompt/);
  assert.match(builder, /請將上述指令複製/);
  assert.doesNotMatch(builder, /openai\.chat|anthropic\.messages|generateText\(|streamText\(/);
});
