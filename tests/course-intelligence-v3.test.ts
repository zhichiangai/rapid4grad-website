import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { aggregateLessonIntelligence } from "@/lib/course/intelligence";

test("Course Intelligence V3 derives milestones, completion and replay evidence", () => {
  const sessions = [
    { lesson_id: "lesson", user_id: "a", duration_seconds: 100, last_position_seconds: 100, max_position_seconds: 100, watch_time_seconds: 120, completed_at: "now" },
    { lesson_id: "lesson", user_id: "b", duration_seconds: 100, last_position_seconds: 82, max_position_seconds: 82, watch_time_seconds: 70, completed_at: null },
    { lesson_id: "lesson", user_id: "c", duration_seconds: 100, last_position_seconds: 40, max_position_seconds: 50, watch_time_seconds: 45, completed_at: null },
  ];
  const segments = [{ lesson_id: "lesson", user_id: "a", start_seconds: 40, end_seconds: 55, transition_kind: "backward_replay" as const }];
  const questions = [{ lesson_id: "lesson", timestamp_seconds: 42, kind: "question" as const, status: "open" as const }, { lesson_id: "lesson", timestamp_seconds: 42, kind: "unclear" as const, status: "open" as const }];
  const result = aggregateLessonIntelligence("lesson", sessions, segments, questions);
  assert.equal(result.learners, 3);
  assert.equal(result.completionRate, 33);
  assert.equal(result.reached50, 3);
  assert.equal(result.reached80, 2);
  assert.equal(result.reached95, 1);
  assert.equal(result.replayHotspots, 1);
  assert.equal(result.questions, 1);
  assert.equal(result.unclearSignals, 1);
});

test("Course Intelligence V3 keeps Admin Preview out of learner telemetry", async () => {
  const [player, analytics, migration] = await Promise.all([
    readFile("components/course/CourseLearningExperience.tsx", "utf8"),
    readFile("app/api/course/analytics/route.ts", "utf8"),
    readFile("supabase/migrations/20260907100000_course_intelligence_v3.sql", "utf8"),
  ]);
  assert.match(player, /previewMode/);
  assert.match(player, /Admin 預覽不會保存學生觀看進度/);
  assert.match(analytics, /user.id/);
  assert.doesNotMatch(analytics, /user_id.*body/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /course_view_sessions_owner/);
});
