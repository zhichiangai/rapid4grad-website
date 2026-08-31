import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { meetingGroups } from "../lib/meetings/meeting-domain";
import { formatTaipeiMeetingDateTime, parseTaipeiDateTimeLocal } from "../lib/meetings/meeting-time";

const actionSource = readFileSync("app/dashboard/meetings/actions.ts", "utf8");
const pageSource = readFileSync("app/dashboard/meetings/page.tsx", "utf8");
const professorPageSource = readFileSync("app/professor/labs/[labId]/meetings/page.tsx", "utf8");
const migrationSource = readFileSync("supabase/migrations/20260830064359_add_professor_supervision_data_v1.sql", "utf8");

test("Taipei datetime-local converts to UTC and formats back consistently", () => {
  const parsed = parseTaipeiDateTimeLocal("2026-09-04T14:00");
  assert.equal(parsed?.toISOString(), "2026-09-04T06:00:00.000Z");
  assert.match(formatTaipeiMeetingDateTime(parsed!.toISOString()), /09\/04/);
  assert.match(formatTaipeiMeetingDateTime(parsed!.toISOString()), /14:00/);
});

test("meeting groups only treat future scheduled rows as upcoming", () => {
  const now = new Date("2026-09-04T06:00:00.000Z");
  const groups = meetingGroups([
    { id: "future", lab_id: "lab", student_user_id: "student", meeting_at: "2026-09-05T06:00:00.000Z", status: "scheduled", summary: null, decisions: null, next_meeting_at: null, created_by: "student", created_at: "2026-09-01T00:00:00.000Z", updated_at: "2026-09-01T00:00:00.000Z" },
    { id: "past", lab_id: "lab", student_user_id: "student", meeting_at: "2026-09-03T06:00:00.000Z", status: "scheduled", summary: null, decisions: null, next_meeting_at: "2026-09-10T06:00:00.000Z", created_by: "student", created_at: "2026-09-01T00:00:00.000Z", updated_at: "2026-09-01T00:00:00.000Z" },
    { id: "done", lab_id: "lab", student_user_id: "student", meeting_at: "2026-09-02T06:00:00.000Z", status: "completed", summary: "done", decisions: null, next_meeting_at: "2026-09-10T06:00:00.000Z", created_by: "professor", created_at: "2026-09-01T00:00:00.000Z", updated_at: "2026-09-01T00:00:00.000Z" },
  ], now);
  assert.deepEqual(groups.upcoming.map((meeting) => meeting.id), ["future"]);
  assert.deepEqual(groups.pending.map((meeting) => meeting.id), ["past"]);
  assert.deepEqual(groups.history.map((meeting) => meeting.id), ["done"]);
});

test("meeting mutations stay behind server actions and preserve lifecycle boundaries", () => {
  assert.match(actionSource, /"use server"/);
  assert.match(actionSource, /requireActiveUser/);
  assert.match(actionSource, /created_by: context\.user\.id/);
  assert.match(actionSource, /studentUserId = context\.user\.id/);
  assert.match(actionSource, /expected_updated_at/);
  assert.match(actionSource, /status = "canceled"/);
  assert.doesNotMatch(actionSource, /\.from\("meetings"\)\.delete/);
  assert.doesNotMatch(pageSource, /createClient\(\)/);
  assert.doesNotMatch(professorPageSource, /createV2AdminClient/);
});

test("frozen RLS keeps meeting identity immutable and restricts supervisor writes to active functional Labs", () => {
  assert.match(migrationSource, /prevent_meeting_identity_change/);
  assert.match(migrationSource, /has_active_lab_subscription/);
  assert.match(migrationSource, /target_lab\.status = 'active'/);
  assert.match(migrationSource, /meetings_select_student_or_supervisor/);
  assert.match(migrationSource, /meetings_insert_supervisor/);
  assert.match(migrationSource, /meetings_update_supervisor/);
  assert.doesNotMatch(migrationSource, /CREATE POLICY[\s\S]*ON public\.meetings FOR DELETE/);
});

test("Meeting Center uses the required routes and does not expose Meeting Actions UI", () => {
  const studentPage = readFileSync("app/dashboard/meetings/page.tsx", "utf8");
  const professorPage = readFileSync("app/professor/labs/[labId]/meetings/page.tsx", "utf8");
  const component = readFileSync("components/meetings/MeetingCenter.tsx", "utf8");
  assert.match(studentPage, /loadStudentMeetings/);
  assert.match(professorPage, /loadProfessorLabMeetings/);
  assert.match(component, /待補 Meeting 紀錄/);
  assert.doesNotMatch(component, /Add Action|Create Task|Kanban|Coming Soon/);
});
