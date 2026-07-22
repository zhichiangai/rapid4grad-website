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
  assert.match(publicPage, /hasUsedAnonymousTrial/);
  assert.match(dashboardPage, /prompt_templates/);
});

test("Phase 1 Prompt Builder retains local template fallback and external execution", () => {
  assert.match(container, /buildPrompt\(/);
  assert.match(container, /activePromptTemplates/);
  assert.match(container, /本地 fallback/);
  assert.match(builder, /buildLocalFallbackPrompt/);
  assert.match(builder, /請將上述指令複製/);
  assert.doesNotMatch(builder, /openai\.chat|anthropic\.messages|generateText\(|streamText\(/);
});
