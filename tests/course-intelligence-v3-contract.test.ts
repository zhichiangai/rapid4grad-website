import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(path, "utf8");

test("Course Intelligence V3 exposes human lifecycle operations", async () => {
  const [migration, actions, page, workspace] = await Promise.all([
    source("supabase/migrations/20260907100000_course_intelligence_v3.sql"),
    source("app/admin/course/actions.ts"),
    source("app/admin/course/page.tsx"),
    source("components/admin/CourseLessonWorkspace.tsx"),
  ]);
  for (const state of ["draft", "live", "paused", "archived"]) assert.match(migration, new RegExp(`'${state}'`));
  for (const operation of ["pauseCourseLesson", "resumeCourseLesson", "archiveCourseLesson", "restoreArchivedCourseLesson"]) assert.match(actions, new RegExp(`export async function ${operation}`));
  assert.match(workspace, /暫停上架/);
  assert.match(workspace, /恢復上架/);
  assert.match(workspace, /已封存/);
  assert.match(page, /待處理/);
  assert.match(page, /學習數據/);
  assert.match(page, /提問/);
});

test("Course Intelligence V3 has narrow learner-owned tables and no destructive migration", async () => {
  const migration = await source("supabase/migrations/20260907100000_course_intelligence_v3.sql");
  assert.match(migration, /CREATE TABLE public\.course_view_sessions/);
  assert.match(migration, /CREATE TABLE public\.course_watch_segments/);
  assert.match(migration, /CREATE TABLE public\.course_questions/);
  assert.match(migration, /CREATE TABLE public\.course_video_versions/);
  assert.match(migration, /WITH CHECK \(user_id = auth\.uid\(\)\)/);
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|DELETE FROM/);
});

test("Course Intelligence V3 student controls capture timestamp questions", async () => {
  const [player, route] = await Promise.all([source("components/course/CourseLearningExperience.tsx"), source("app/api/course/questions/route.ts")]);
  assert.match(player, /這段看不懂/);
  assert.match(player, /timestampSeconds/);
  assert.match(route, /user\.id/);
  assert.match(route, /kind/);
  assert.match(route, /timestamp_seconds/);
  assert.doesNotMatch(route, /body\.userId|body\.user_id/);
});
