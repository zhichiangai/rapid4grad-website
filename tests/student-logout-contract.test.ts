import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path: string) => fs.readFileSync(path, "utf8");

test("Student navigation exposes a separated logout control only in real mode", () => {
  const navigation = read("components/workspace/StudentWorkspaceNavigation.tsx");
  const signOut = read("components/workspace/StudentSignOutButton.tsx");

  assert.match(navigation, /!previewMode \? <div className="border-t/);
  assert.match(navigation, /<StudentSignOutButton \/>/);
  assert.match(signOut, /auth\.signOut\(\)/);
  assert.match(signOut, /router\.replace\("\/login"\)/);
  assert.match(signOut, /登出失敗，請稍後再試。/);
});

test("Admin Preview cannot execute the real Student logout control", () => {
  const navigation = read("components/workspace/StudentWorkspaceNavigation.tsx");

  assert.match(navigation, /previewMode \? \(\s*<button/);
  assert.match(navigation, /!previewMode \? <div className="border-t[\s\S]*<StudentSignOutButton \/>[\s\S]*: null/);
  assert.doesNotMatch(navigation, /previewMode \? <StudentSignOutButton/);
});

test("Student navigation keeps capability filtering for Lab and course links", () => {
  const navigation = read("components/workspace/StudentWorkspaceNavigation.tsx");

  assert.match(navigation, /capabilities\?\.lab\.canUsePdfAudit === true/);
  assert.match(navigation, /capabilities\?\.course\.canOpenLearningCenter !== false/);
  assert.match(navigation, /capabilities\?\.lab\.hasActiveLab !== true/);
  assert.match(navigation, /md:flex-col md:items-end lg:flex-row lg:items-center/);
});
