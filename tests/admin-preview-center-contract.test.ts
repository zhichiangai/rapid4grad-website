import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

function readRepoFile(path: string) {
  return readFileSync(
    fileURLToPath(new URL(`../${path}`, import.meta.url)),
    "utf8",
  );
}

const previewCenter = readRepoFile("components/admin/AdminPreviewCenter.tsx");
const studentPage = readRepoFile("app/dashboard/page.tsx");
const studentLayout = readRepoFile("app/dashboard/layout.tsx");
const professorPage = readRepoFile("app/professor/dashboard/page.tsx");

test("Admin preview center renders the shared student and Professor views", () => {
  assert.match(previewCenter, /StudentWorkspaceNavigation previewMode/);
  assert.match(previewCenter, /StudentWorkspaceHome[\s\S]*previewMode/);
  assert.match(previewCenter, /ProfessorWorkspaceHome[\s\S]*previewMode/);
  assert.match(previewCenter, /目前狀態設定/);
});

test("formal workspace pages use the same presentation components", () => {
  assert.match(studentPage, /StudentWorkspaceHome/);
  assert.match(studentLayout, /StudentWorkspaceNavigation/);
  assert.match(professorPage, /ProfessorWorkspaceHome/);
});

test("preview center does not query or mutate real workspace records", () => {
  assert.doesNotMatch(previewCenter, /createClient|createV2Client|createV2AdminClient/);
  assert.doesNotMatch(previewCenter, /fetch\(|\.from\(\s*["']/);
  assert.match(previewCenter, /Preview 中不可/);
});
