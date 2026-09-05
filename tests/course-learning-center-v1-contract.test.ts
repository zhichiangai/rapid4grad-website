import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = {
  player: "components/course/CourseLearningExperience.tsx",
  learn: "app/learn/page.tsx",
  dashboard: "app/dashboard/page.tsx",
  nav: "components/workspace/StudentWorkspaceNavigation.tsx",
  studio: "app/admin/course/page.tsx",
  studioActions: "app/admin/course/actions.ts",
  preview: "app/admin/course/preview/page.tsx",
  sidebar: "components/admin/AdminSidebar.tsx",
  legacy: "app/dashboard/course/page.tsx",
};

async function source(path: string) {
  return readFile(path, "utf8");
}

test("Learning Center resumes deterministic lesson and saved seconds", async () => {
  const player = await source(files.player);
  assert.match(player, /in_progress/);
  assert.match(player, /status !== "completed"/);
  assert.match(player, /progressSeconds/);
  assert.match(player, /onLoadedMetadata/);
  assert.match(player, /currentTime = resume/);
  assert.match(player, /onPause/);
});

test("Learning Center exposes completion, modules, previous and next controls", async () => {
  const player = await source(files.player);
  assert.match(player, /已完成/);
  assert.match(player, /aria-current/);
  assert.match(player, /上一課/);
  assert.match(player, /下一課/);
  assert.match(player, /查看課程目錄/);
  assert.match(player, /開啟教材/);
});

test("course routes keep the learning and purchase surfaces separate", async () => {
  const [learn, legacy, nav] = await Promise.all([source(files.learn), source(files.legacy), source(files.nav)]);
  assert.match(learn, /CourseLearningExperience/);
  assert.match(legacy, /redirect\("\/learn"\)/);
  assert.match(nav, /href: "\/learn", label: "課程學習"/);
});

test("dashboard uses a compact authenticated course query and entry", async () => {
  const [dashboard, home] = await Promise.all([source(files.dashboard), source("components/workspace/StudentWorkspaceHome.tsx")]);
  assert.match(dashboard, /from\("courses"\)/);
  assert.match(dashboard, /from\("course_progress"\)/);
  assert.match(dashboard, /setLearningSummary/);
  assert.match(home, /LEARNING CENTER/);
  assert.match(home, /href="\/learn"/);
});

test("Course Studio is active-admin protected and validates server-side", async () => {
  const [studio, actions, preview, sidebar] = await Promise.all([source(files.studio), source(files.studioActions), source(files.preview), source(files.sidebar)]);
  assert.match(studio, /requireAdminContext\("\/admin\/course"\)/);
  assert.match(studio, /saveCourseLesson/);
  assert.match(actions, /requireAdminContext\("\/admin\/course"\)/);
  assert.match(actions, /videoProvider === "html5"/);
  assert.match(actions, /https:/);
  assert.match(actions, /isPublished/);
  assert.doesNotMatch(actions, /\.delete\(/);
  assert.match(preview, /previewMode/);
  assert.match(sidebar, /href: "\/admin\/course", label: "課程內容"/);
});

test("Course Studio never exposes service credentials to browser components", async () => {
  const [player, studio, preview] = await Promise.all([source(files.player), source(files.studio), source(files.preview)]);
  for (const content of [player, studio, preview]) {
    assert.doesNotMatch(content, /SUPABASE_SECRET_KEY|SERVICE_ROLE|createAdminClient|createV2AdminClient/);
  }
});

test("Course release remains zero-migration and preserves existing access tiers", async () => {
  const [actions, player, courseAccess] = await Promise.all([source(files.studioActions), source(files.player), source("tests/v2-course-content-access-contract.test.ts")]);
  assert.doesNotMatch(actions, /ALTER TABLE|CREATE TABLE|CREATE POLICY|CREATE FUNCTION/);
  assert.match(player, /public_preview|lab_basic|full_course/);
  assert.match(courseAccess, /all three tiers/);
});
