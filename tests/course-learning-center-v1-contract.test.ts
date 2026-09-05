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
  assert.match(actions, /VIDEO_PROVIDERS/);
  assert.match(actions, /videoProvider === "mux"/);
  assert.match(actions, /muxPlaybackId/);
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

test("Mux provider uses opaque Playback IDs while HTML5 remains a fallback", async () => {
  const [actions, route, playback, player] = await Promise.all([
    source(files.studioActions),
    source("app/api/course/lessons/[lessonId]/playback/route.ts"),
    source("lib/course/playback.ts"),
    source(files.player),
  ]);
  assert.match(actions, /VIDEO_PROVIDERS = \["mux", "html5"\]/);
  assert.match(actions, /video_external_id: playbackId/);
  assert.match(route, /provider: "mux"/);
  assert.match(route, /playbackId: lesson.video_external_id/);
  assert.match(route, /playbackToken/);
  assert.match(playback, /provider: "html5"/);
  assert.match(player, /playback\?\.provider === "mux"/);
  assert.match(player, /<video/);
});

test("Mux signing secrets stay on the server boundary", async () => {
  const [mux, route, player, studio] = await Promise.all([
    source("lib/course/mux.ts"),
    source("app/api/course/lessons/[lessonId]/playback/route.ts"),
    source(files.player),
    source(files.studio),
  ]);
  assert.match(mux, /server-only/);
  assert.match(mux, /MUX_SIGNING_KEY_ID/);
  assert.match(mux, /MUX_SIGNING_PRIVATE_KEY/);
  assert.match(mux, /SignJWT/);
  assert.match(route, /signMuxPlaybackToken/);
  for (const content of [player, studio]) {
    assert.doesNotMatch(content, /MUX_SIGNING_PRIVATE_KEY|MUX_SIGNING_KEY_ID|NEXT_PUBLIC_MUX/);
  }
});

test("Published Mux lessons require a valid opaque Playback ID", async () => {
  const [actions, mux] = await Promise.all([source(files.studioActions), source("lib/course/mux.ts")]);
  assert.match(actions, /isValidMuxPlaybackId\(playbackId\)/);
  assert.match(actions, /!lesson\.isPublished/);
  assert.match(mux, /MAX_PLAYBACK_ID_LENGTH/);
  assert.match(mux, /\[\\u0000-\\u001f\\u007f\\s\]/);
});

test("Preview mode does not request playback or persist progress", async () => {
  const [player, preview] = await Promise.all([source(files.player), source(files.preview)]);
  assert.match(player, /if \(previewMode \|\| !isAuthenticated/);
  assert.match(player, /previewMode \? <p/);
  assert.match(player, /不會取得影片來源或寫入觀看進度/);
  assert.match(preview, /previewMode/);
  assert.doesNotMatch(preview, /playbackToken|signMuxPlaybackToken|course_progress/);
});

test("Course progress remains the authenticated course_progress workflow", async () => {
  const [player, progress] = await Promise.all([source(files.player), source("app/api/course/progress/route.ts")]);
  assert.match(player, /\/api\/course\/progress/);
  assert.match(progress, /course_progress/);
  assert.doesNotMatch(player, /createV2AdminClient|SUPABASE_SECRET_KEY|SERVICE_ROLE/);
});
