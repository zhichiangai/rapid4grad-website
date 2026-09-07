import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = {
  player: "components/course/CourseLearningExperience.tsx",
  learn: "app/learn/page.tsx",
  dashboard: "app/dashboard/page.tsx",
  nav: "components/workspace/StudentWorkspaceNavigation.tsx",
  studio: "app/admin/course/page.tsx",
  workspace: "components/admin/CourseLessonWorkspace.tsx",
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
  const [studio, workspace, actions, preview, sidebar] = await Promise.all([source(files.studio), source(files.workspace), source(files.studioActions), source(files.preview), source(files.sidebar)]);
  assert.match(studio, /requireAdminContext\("\/admin\/course"\)/);
  assert.match(workspace, /saveCourseLesson/);
  assert.match(actions, /requireAdminContext\("\/admin\/course"\)/);
  assert.match(actions, /VIDEO_PROVIDERS/);
  assert.match(actions, /videoProvider === "mux"/);
  assert.match(actions, /muxPlaybackId/);
  assert.match(actions, /https:/);
  assert.match(actions, /isPublished/);
  assert.match(actions, /video_status/);
  assert.match(actions, /deleteDraftCourseLesson/);
  assert.match(actions, /removeCourseLessonVideo/);
  assert.match(actions, /createMuxClient\(\)\.video\.assets\.delete/);
  assert.match(actions, /course_progress/);
  assert.match(preview, /previewMode/);
  assert.match(sidebar, /href: "\/admin\/course", label: "Video Course"/);
  assert.doesNotMatch(sidebar, /Course Admin Studio/);
  assert.match(studio, /Video Course/);
  assert.match(studio, /課程影片管理/);
  assert.match(workspace, /createDraftCourseLesson/);
  assert.match(workspace, /選擇影片/);
  assert.match(workspace, /進階設定/);
  assert.match(workspace, /發布課程/);
  assert.match(studio, /影片狀態/);
  assert.match(actions, /select\("id"\)\.single\(\)/);
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
  assert.match(player, /previewPlaybackEnabled/);
  assert.match(player, /不會取得或寫入學生觀看進度/);
  assert.match(player, /\/playback/);
  assert.match(preview, /previewMode/);
  assert.doesNotMatch(preview, /playbackToken|signMuxPlaybackToken|course_progress/);
});

test("Admin preview playback is ready-only and progress-free", async () => {
  const [preview, player, adminPlayback] = await Promise.all([source(files.preview), source(files.player), source("app/api/admin/course/lessons/[lessonId]/playback/route.ts")]);
  assert.match(preview, /previewMode previewPlaybackEnabled=\{canPlay\}/);
  assert.match(preview, /playbackEndpoint="\/api\/admin\/course\/lessons"/);
  assert.match(player, /previewMode && !previewPlaybackEnabled/);
  assert.match(adminPlayback, /requireAdminContext/);
  assert.match(adminPlayback, /video_status !== "ready"/);
  assert.match(player, /if \(previewMode \|\| !isAuthenticated/);
});

test("Course operations preserve metadata while controlling publication and deletion", async () => {
  const [actions, workspace] = await Promise.all([source(files.studioActions), source(files.workspace)]);
  assert.match(actions, /unpublishCourseLesson/);
  assert.match(actions, /is_published: false/);
  assert.match(actions, /video_external_id: null/);
  assert.match(actions, /video_asset_id: null/);
  assert.match(actions, /confirmPublishedRemove/);
  assert.match(actions, /confirmDelete/);
  assert.match(actions, /count: "exact", head: true/);
  assert.match(actions, /deleteTrustedMuxAsset\(lesson\.video_asset_id\)/);
  assert.match(actions, /current\?\.video_provider === "mux"/);
  assert.match(actions, /current\?\.video_status === "ready"/);
  assert.match(workspace, /取消發布/);
  assert.match(workspace, /取消發布並移除影片/);
  assert.match(workspace, /危險操作/);
  assert.match(workspace, /學生顯示位置/);
});

test("Course Operations V2.1 uses an existing lesson first and makes creation explicit", async () => {
  const [studio, workspace] = await Promise.all([source(files.studio), source(files.workspace)]);
  assert.match(studio, /params\.new === "1"/);
  assert.match(studio, /explicitLesson \?\? lessons\[0\]/);
  assert.match(studio, /href="\/admin\/course\?new=1"/);
  assert.match(studio, /aria-current=\{selected \? "page"/);
  assert.match(studio, /搜尋課程名稱/);
  assert.match(studio, /全部分類/);
  assert.match(studio, /全部狀態/);
  assert.match(studio, /觀看對象/);
  assert.match(studio, /上架狀態/);
  assert.match(studio, /影片狀態/);
  assert.doesNotMatch(studio, /lesson\.slug\} ·/);
  assert.doesNotMatch(studio, /Mux Video/);
  assert.match(workspace, /目前營運狀態/);
  assert.match(workspace, /學生顯示位置/);
  assert.match(workspace, /target="_blank"/);
  assert.match(workspace, /發布課程/);
  assert.match(workspace, /取消發布/);
  assert.match(workspace, /更多操作/);
  assert.match(workspace, /危險操作/);
});

test("Course Operations V2.1 keeps direct upload and auto-draft flow", async () => {
  const workspace = await source(files.workspace);
  assert.match(workspace, /createDraftCourseLesson/);
  assert.match(workspace, /系統會先自動建立草稿/);
  assert.match(workspace, /不需要先儲存/);
  assert.match(workspace, /MuxVideoUploader/);
  assert.match(workspace, /選擇影片/);
});

test("Course progress remains the authenticated course_progress workflow", async () => {
  const [player, progress] = await Promise.all([source(files.player), source("app/api/course/progress/route.ts")]);
  assert.match(player, /\/api\/course\/progress/);
  assert.match(progress, /course_progress/);
  assert.doesNotMatch(player, /createV2AdminClient|SUPABASE_SECRET_KEY|SERVICE_ROLE/);
});

test("Direct upload is an Admin-only browser-to-Mux workflow", async () => {
  const [route, uploader, auth] = await Promise.all([
    source("app/api/admin/course/lessons/[lessonId]/upload/route.ts"),
    source("components/admin/MuxVideoUploader.tsx"),
    source("lib/admin/authorization.ts"),
  ]);
  assert.match(route, /requireAdminContext/);
  assert.match(route, /video\.uploads\.create/);
  assert.match(route, /cors_origin: request\.nextUrl\.origin/);
  assert.match(route, /playback_policies: \["signed"\]/);
  assert.match(route, /external_id: lesson\.id/);
  assert.match(route, /video_upload_id: upload\.id/);
  assert.match(uploader, /XMLHttpRequest/);
  assert.match(uploader, /uploadUrl/);
  assert.match(uploader, /直接安全傳送至 Mux/);
  assert.doesNotMatch(uploader, /MUX_TOKEN_SECRET|MUX_SIGNING_PRIVATE_KEY/);
  assert.match(auth, /accountStatus: "active"/);
});

test("Video bytes never pass through a RAPID upload body", async () => {
  const [route, uploader] = await Promise.all([
    source("app/api/admin/course/lessons/[lessonId]/upload/route.ts"),
    source("components/admin/MuxVideoUploader.tsx"),
  ]);
  assert.doesNotMatch(route, /request\.formData|request\.arrayBuffer|request\.blob/);
  assert.doesNotMatch(uploader, /FormData|arrayBuffer|\/api\/admin\/course\/upload/);
  assert.match(uploader, /request\.send\(file\)/);
});

test("Mux webhook requires a verified signature and is idempotent by current asset", async () => {
  const webhook = await source("app/api/webhooks/mux/route.ts");
  assert.match(webhook, /webhooks\.unwrap/);
  assert.match(webhook, /status: 401/);
  assert.match(webhook, /video\.upload\.asset_created/);
  assert.match(webhook, /video\.asset\.ready/);
  assert.match(webhook, /video\.asset\.errored/);
  assert.match(webhook, /eq\("video_upload_id", uploadId\)/);
  assert.match(webhook, /eq\("video_asset_id", assetId\)/);
  assert.match(webhook, /external_id/);
  assert.match(webhook, /video_status: "processing"/);
  assert.match(webhook, /video_status: "ready"/);
  assert.match(webhook, /video_status: "errored"/);
});

test("Publishing requires ready video and replacement preserves the old Playback ID", async () => {
  const [actions, upload, adminPlayback] = await Promise.all([
    source(files.studioActions),
    source("app/api/admin/course/lessons/[lessonId]/upload/route.ts"),
    source("app/api/admin/course/lessons/[lessonId]/playback/route.ts"),
  ]);
  assert.match(actions, /muxReady/);
  assert.match(actions, /video_status/);
  assert.match(upload, /video_upload_id: upload\.id/);
  assert.doesNotMatch(upload, /video_external_id/);
  assert.match(adminPlayback, /video_status !== "ready"/);
  assert.match(adminPlayback, /video_external_id/);
});

test("Course video lifecycle is narrow and does not change access policy", async () => {
  const migration = await source("supabase/migrations/20260906100000_course_video_upload_lifecycle.sql");
  assert.match(migration, /ADD COLUMN video_upload_id/);
  assert.match(migration, /ADD COLUMN video_asset_id/);
  assert.match(migration, /video_status/);
  assert.match(migration, /video_status IN \('empty', 'uploading', 'processing', 'ready', 'errored'\)/);
  assert.doesNotMatch(migration, /CREATE POLICY|DROP POLICY|CREATE TABLE|ALTER TABLE public\.course_lessons\s+ENABLE/);
});
