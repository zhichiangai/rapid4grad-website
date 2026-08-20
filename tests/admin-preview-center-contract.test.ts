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
const previewViews = readRepoFile("components/admin/WorkspacePreviewViews.tsx");
const studentNavigation = readRepoFile(
  "components/workspace/StudentWorkspaceNavigation.tsx",
);
const aiCommand = readRepoFile(
  "components/ai-command/AiCommandContainer.tsx",
);
const uploadForm = readRepoFile(
  "components/ai-audit/DocumentUploadForm.tsx",
);
const auditPanel = readRepoFile(
  "components/ai-audit/AuditStreamingPanel.tsx",
);
const labJoinForm = readRepoFile("components/labs/LabJoinForm.tsx");
const coursePlayer = readRepoFile(
  "components/course/CourseLearningExperience.tsx",
);
const studentPage = readRepoFile("app/dashboard/page.tsx");
const studentLayout = readRepoFile("app/dashboard/layout.tsx");
const professorPage = readRepoFile("app/professor/dashboard/page.tsx");

test("Admin preview center renders the shared student and Professor views", () => {
  assert.match(previewCenter, /StudentWorkspacePreview/);
  assert.match(previewCenter, /ProfessorWorkspaceHome[\s\S]*previewMode/);
  assert.match(previewCenter, /ProfessorSecondaryPreview/);
  assert.match(previewCenter, /目前狀態設定/);
});

test("preview navigation switches controlled views instead of leaving the canvas", () => {
  assert.match(studentNavigation, /onPreviewNavigate/);
  assert.match(studentNavigation, /onClick=\{\(\) => onPreviewNavigate\?\.\(link\.href\)\}/);
  assert.match(studentNavigation, /aria-current=\{activeHref === link\.href/);
  assert.match(previewCenter, /studentPreviewHref/);
  assert.match(previewCenter, /professorPreviewView/);
});

test("preview canvas reuses interactive formal feature components", () => {
  assert.match(previewViews, /AiCommandContainer previewMode/);
  assert.match(previewViews, /DocumentUploadForm[\s\S]*previewMode/);
  assert.match(previewViews, /AuditStreamingPanel[\s\S]*previewMode/);
  assert.match(previewViews, /LabJoinForm previewMode/);
  assert.match(previewViews, /CourseLearningExperience previewMode/);
});

test("preview interactions cannot call mutation APIs", () => {
  assert.match(aiCommand, /if \(previewMode\)[\s\S]*setGeneratedPrompt\(prompt\)[\s\S]*return/);
  assert.match(uploadForm, /if \(previewMode\)[\s\S]*Preview 模擬完成[\s\S]*return/);
  assert.match(auditPanel, /if \(previewMode\)[\s\S]*Preview 模擬完成[\s\S]*return/);
  assert.match(labJoinForm, /if \(previewMode\)[\s\S]*Preview 模擬成功[\s\S]*return/);
  assert.match(coursePlayer, /if \(previewMode \|\| !isAuthenticated/);
});

test("formal workspace pages use the same presentation components", () => {
  assert.match(studentPage, /StudentWorkspaceHome/);
  assert.match(studentLayout, /StudentWorkspaceNavigation/);
  assert.match(professorPage, /ProfessorWorkspaceHome/);
});

test("preview center does not query or mutate real workspace records", () => {
  assert.doesNotMatch(previewCenter, /createClient|createV2Client|createV2AdminClient/);
  assert.doesNotMatch(previewCenter, /fetch\(|\.from\(\s*["']/);
  assert.doesNotMatch(previewViews, /createClient|createV2Client|createV2AdminClient/);
  assert.doesNotMatch(previewViews, /fetch\(|\.from\(\s*["']/);
  assert.match(previewCenter, /Preview/);
});
