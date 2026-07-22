import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = {
  legacyCourse: "app/dashboard/course/page.tsx",
  learnPage: "app/learn/page.tsx",
  player: "components/course/CourseLearningExperience.tsx",
  playbackRoute: "app/api/course/lessons/[lessonId]/playback/route.ts",
  progressRoute: "app/api/course/progress/route.ts",
  rls: "supabase/migrations/007_grants_rls_storage_and_seed.sql",
};

async function source(path: string) {
  return readFile(path, "utf8");
}

test("course UI uses a native video player and removes the hardcoded YouTube embed", async () => {
  const [legacyCourse, player] = await Promise.all([
    source(files.legacyCourse),
    source(files.player),
  ]);

  assert.match(legacyCourse, /redirect\("\/learn"\)/);
  assert.doesNotMatch(legacyCourse, /youtube|youtu\.be|iframe|dQw4w9WgXcQ/i);
  assert.match(player, /<video/);
  assert.match(player, /controls/);
  assert.doesNotMatch(player, /youtube|youtu\.be|iframe/i);
});

test("lesson metadata and playback source cross separate server boundaries", async () => {
  const [learnPage, playbackRoute] = await Promise.all([
    source(files.learnPage),
    source(files.playbackRoute),
  ]);

  assert.match(learnPage, /from\("course_lessons"\)/);
  assert.doesNotMatch(learnPage, /video_external_id/);
  assert.match(playbackRoute, /from\("course_lessons"\)/);
  assert.match(playbackRoute, /video_external_id/);
  assert.match(playbackRoute, /Cache-Control/);
  assert.doesNotMatch(playbackRoute, /createV2AdminClient|createAdminClient/);
});

test("progress writes are owner scoped and require access to the lesson", async () => {
  const progressRoute = await source(files.progressRoute);

  assert.match(progressRoute, /supabase\.auth\.getUser\(\)/);
  assert.match(progressRoute, /user_id: user\.id/);
  assert.match(progressRoute, /from\("course_lessons"\)/);
  assert.match(progressRoute, /from\("course_progress"\)/);
  assert.doesNotMatch(progressRoute, /createV2AdminClient|createAdminClient/);
});

test("database RLS defines all three tiers without role-based full-course escalation", async () => {
  const rls = await source(files.rls);

  assert.match(rls, /access_level = 'public_preview'/);
  assert.match(rls, /access_level = 'lab_basic'/);
  assert.match(rls, /has_lab_basic_access/);
  assert.match(rls, /has_active_course_full/);
  assert.doesNotMatch(
    rls,
    /role\s*=\s*'professor'[\s\S]*full_course/,
  );
});
