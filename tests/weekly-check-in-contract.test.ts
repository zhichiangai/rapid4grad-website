import assert from "node:assert/strict";
import { test } from "node:test";
import { getTaipeiMonday, formatWeekRange } from "../lib/supervision/week";
import { readFileSync } from "node:fs";

const root = process.cwd();

test("Taipei week utility returns the correct Monday across UTC midnight", () => {
  assert.equal(getTaipeiMonday(new Date("2026-08-30T15:59:59Z")), "2026-08-24");
  assert.equal(getTaipeiMonday(new Date("2026-08-30T16:00:00Z")), "2026-08-31");
  assert.equal(getTaipeiMonday(new Date("2026-12-31T16:30:00Z")), "2026-12-28");
  assert.match(formatWeekRange("2026-08-24"), /8\/24.*8\/30/);
});

test("Weekly Check-in keeps ownership fields server-derived", () => {
  const actions = readFileSync(`${root}/app/dashboard/weekly-check-in/actions.ts`, "utf8");
  assert.match(actions, /context\.user\.id/);
  assert.match(actions, /getTaipeiMonday\(\)/);
  assert.match(actions, /lab_memberships/);
  assert.doesNotMatch(actions, /formData\.get\(["'](?:lab_id|student_user_id|week_start)["']\)/);
  assert.match(actions, /onConflict: "lab_id,student_user_id,week_start"/);
});

test("Weekly Check-in UI uses semantic radio groups and safe error messages", () => {
  const form = readFileSync(`${root}/components/student/WeeklyCheckInForm.tsx`, "utf8");
  const actions = readFileSync(`${root}/app/dashboard/weekly-check-in/actions.ts`, "utf8");
  const navigation = readFileSync(`${root}/components/workspace/StudentWorkspaceNavigation.tsx`, "utf8");
  assert.match(form, /<fieldset>/);
  assert.match(form, /name="self_status"/);
  assert.match(form, /name="needs_professor_help"/);
  assert.match(form, /maxLength=\{?2000\}?/);
  assert.match(actions, /儲存失敗，請稍後再試/);
  assert.match(navigation, /weekly-check-in/);
});
