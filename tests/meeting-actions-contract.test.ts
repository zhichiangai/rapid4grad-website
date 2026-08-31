import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { groupStudentActions, isActionDueSoon, isActionOverdue } from "../lib/meeting-actions/action-domain";

const action = (overrides: Record<string, unknown> = {}) => ({
  id: "a", meeting_id: "m", lab_id: "l", student_user_id: "s", title: "next", owner_type: "student" as const, owner_user_id: "s", due_date: null, status: "todo" as const, completed_at: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", ...overrides,
});

test("Meeting Actions domain groups Taipei due dates and limits history", () => {
  const groups = groupStudentActions([
    action({ id: "overdue", due_date: "2026-07-18" }),
    action({ id: "soon", due_date: "2026-07-25" }),
    action({ id: "later", due_date: "2026-08-10" }),
    action({ id: "done", status: "done", completed_at: "2026-07-20T00:00:00Z", updated_at: "2026-07-20T00:00:00Z" }),
  ], "2026-07-20");
  assert.deepEqual(groups.overdue.map((item) => item.id), ["overdue"]);
  assert.deepEqual(groups.dueSoon.map((item) => item.id), ["soon"]);
  assert.deepEqual(groups.otherOpen.map((item) => item.id), ["later"]);
  assert.deepEqual(groups.history.map((item) => item.id), ["done"]);
  assert.equal(isActionOverdue(action({ due_date: "2026-07-19" }), "2026-07-20"), true);
  assert.equal(isActionDueSoon(action({ due_date: "2026-08-03" }), "2026-07-20"), true);
});

test("Meeting Actions server boundary derives ownership and forbids delete", () => {
  const actions = fs.readFileSync("app/dashboard/actions/actions.ts", "utf8");
  assert.match(actions, /requireActiveUser/);
  assert.match(actions, /meeting\.status !== "completed"/);
  assert.match(actions, /ownerUserId = meeting\.student_user_id/);
  assert.match(actions, /completed_at: nextStatus === "done"/);
  assert.doesNotMatch(actions, /\.delete\(/);
  assert.doesNotMatch(actions, /owner_user_id.*formData/);
});

test("Meeting Actions UI keeps completed-only creation and read-only supervisor actions", () => {
  const center = fs.readFileSync("components/meetings/MeetingCenter.tsx", "utf8");
  const list = fs.readFileSync("components/meeting-actions/MeetingActionList.tsx", "utf8");
  const nav = fs.readFileSync("components/workspace/StudentWorkspaceNavigation.tsx", "utf8");
  assert.match(center, /meeting\.status === "completed"/);
  assert.match(list, /canWrite/);
  assert.match(nav, /\/dashboard\/actions/);
});
