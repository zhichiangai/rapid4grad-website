import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path: string) => fs.readFileSync(path, "utf8");

test("Student Workspace UX V2 keeps Research 360 hierarchy and existing semantics", () => {
  const home = read("components/workspace/StudentWorkspaceHome.tsx");
  const dashboard = read("app/dashboard/page.tsx");
  const navigation = read("components/workspace/StudentWorkspaceNavigation.tsx");
  const advisorPage = read("app/dashboard/advisor-profile/page.tsx");
  const advisorSettings = read("components/workspace/AdvisorMemorySettings.tsx");

  assert.match(home, /CURRENT RESEARCH STATUS/);
  assert.match(home, /NOW/);
  assert.match(home, /THIS WEEK/);
  assert.match(home, /THESIS JOURNEY/);
  assert.match(home, /初始研究狀態診斷/);
  assert.match(home, /RESEARCH TOOLS/);
  assert.match(home, /setup_needed/);
  assert.doesNotMatch(home, /最近一次畢業狀態檢查/);
  assert.match(dashboard, /deriveGraduationRiskStatus/);
  assert.match(navigation, /studentWorkspaceGroups/);
  assert.match(navigation, /aria-current/);
  assert.match(navigation, /aria-controls="student-workspace-menu"/);
  assert.match(navigation, /Escape|關閉選單/);
  assert.match(advisorPage, /dashboard\/advisor-profile/);
  assert.match(advisorSettings, /advisor_memories/);
  assert.match(advisorSettings, /preference_style/);
  assert.equal(fs.readdirSync("supabase/migrations").length, 21);
});
