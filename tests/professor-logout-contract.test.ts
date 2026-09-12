import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path: string) => fs.readFileSync(path, "utf8");

test("Professor workspace exposes a real-mode logout control", () => {
  const workspace = read("components/workspace/ProfessorWorkspaceHome.tsx");
  const signOut = read("components/workspace/ProfessorSignOutButton.tsx");

  assert.match(workspace, /!previewMode \? <ProfessorSignOutButton \/> : null/);
  assert.match(signOut, /auth\.signOut\(\)/);
  assert.match(signOut, /router\.replace\("\/login"\)/);
  assert.match(signOut, /登出失敗，請稍後再試。/);
});

test("Professor Preview does not render the real logout control", () => {
  const workspace = read("components/workspace/ProfessorWorkspaceHome.tsx");

  assert.match(workspace, /previewMode \? \(/);
  assert.match(workspace, /!previewMode \? <ProfessorSignOutButton \/> : null/);
});
