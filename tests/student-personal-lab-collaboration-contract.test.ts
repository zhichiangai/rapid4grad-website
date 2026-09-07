import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path: string) => fs.readFileSync(path, "utf8");

test("Student capability resolver keeps Personal navigation independent from Lab subscription", () => {
  const resolver = read("lib/student/capabilities.ts");
  assert.match(resolver, /personal:/);
  assert.match(resolver, /weekly: true/);
  assert.match(resolver, /meetings: true/);
  assert.match(resolver, /actions: true/);
  assert.match(resolver, /thesis: true/);
  assert.match(resolver, /graduationRisk: true/);
  assert.match(resolver, /advisorProfile: true/);
  assert.match(resolver, /aiNavigator: true/);
  assert.match(resolver, /canOpenLearningCenter: true/);
  assert.match(resolver, /isFunctionalSubscription/);
  assert.match(resolver, /canShareWeekly/);
  assert.match(resolver, /canUsePdfAudit/);
});

test("Personal/Lab migration is additive and makes only scope columns nullable", () => {
  const migration = read("supabase/migrations/20260908120000_student_personal_lab_scope_v1.sql");
  for (const table of ["weekly_updates", "meetings", "meeting_actions"]) {
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table}[\\s\\S]*ALTER COLUMN lab_id DROP NOT NULL`));
  }
  assert.match(migration, /weekly_updates_student_week_key/);
  assert.doesNotMatch(migration, /DROP\s+TABLE/i);
  assert.doesNotMatch(migration, /DROP\s+COLUMN/i);
  assert.doesNotMatch(migration, /TRUNCATE/i);
  assert.doesNotMatch(migration, /DELETE\s+FROM/i);
  assert.doesNotMatch(migration, /UPDATE\s+[^;]+\s+SET/i);
});

test("Weekly RLS separates Personal ownership from shared Lab visibility", () => {
  const migration = read("supabase/migrations/20260908120000_student_personal_lab_scope_v1.sql");
  assert.match(migration, /student_user_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(migration, /lab_id IS NULL/);
  assert.match(migration, /has_active_lab_subscription\(lab_id\)/);
  assert.match(migration, /is_active_lab_member\(\s*lab_id/);
  assert.match(migration, /weekly_updates_select_student_or_supervisor/);
});

test("Meeting and Action RLS preserve Personal ownership and gate Lab scope", () => {
  const migration = read("supabase/migrations/20260908120000_student_personal_lab_scope_v1.sql");
  assert.match(migration, /meetings_insert_personal_or_lab_student/);
  assert.match(migration, /meetings_update_personal_or_lab_student/);
  assert.match(migration, /meeting_actions_insert_personal_or_lab_student/);
  assert.match(migration, /meeting_actions_update_personal_or_lab_student/);
  assert.match(migration, /meeting_actions_meeting_fk/);
  assert.match(migration, /enforce_meeting_action_scope/);
  assert.match(migration, /meeting_action_scope_mismatch/);
  assert.match(migration, /owner_user_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(migration, /created_by = \(SELECT auth\.uid\(\)\)/);
});

test("Weekly UI exposes explicit Lab sharing instead of blocking Personal use", () => {
  const form = read("components/student/WeeklyCheckInForm.tsx");
  const page = read("app/dashboard/weekly-check-in/page.tsx");
  const actions = read("app/dashboard/weekly-check-in/actions.ts");
  assert.match(form, /name="share_to_lab"/);
  assert.match(form, /canShareLab/);
  assert.match(page, /canShareLab/);
  assert.match(actions, /shareToLab/);
  assert.match(actions, /labId : null/);
  assert.match(actions, /onConflict: "student_user_id,week_start"/);
});

test("Meeting UX has a Personal context and only enables Lab context for functional Lab", () => {
  const form = read("components/meetings/MeetingScheduleForm.tsx");
  const center = read("components/meetings/MeetingCenter.tsx");
  const actions = read("app/dashboard/meetings/actions.ts");
  assert.match(form, /name="meeting_context"/);
  assert.match(form, /personal/);
  assert.match(form, /functional/);
  assert.match(center, /Personal 模式/);
  assert.match(actions, /meetingContext/);
  assert.match(actions, /personal/);
  assert.match(actions, /canCreateLabMeeting/);
});

test("Student Actions allow Personal rows while preserving Lab write checks", () => {
  const center = read("components/meeting-actions/StudentActionCenter.tsx");
  const actions = read("app/dashboard/actions/actions.ts");
  const page = read("app/dashboard/actions/page.tsx");
  assert.match(center, /action\.lab_id === null/);
  assert.match(center, /action\.lab_id === activeLabId/);
  assert.match(actions, /canManageLabActions/);
  assert.match(actions, /else if \(meeting\.lab_id\)/);
  assert.match(page, /canWrite=\{capabilities\.personal\.actions\}/);
});

test("Student navigation hides Lab-only PDF audit links without the capability", () => {
  const navigation = read("components/workspace/StudentWorkspaceNavigation.tsx");
  const layout = read("app/dashboard/layout.tsx");
  assert.match(navigation, /canUsePdfAudit/);
  assert.match(navigation, /ai-audit/);
  assert.match(layout, /resolveStudentCapabilities/);
  assert.match(layout, /capabilities/);
});

test("Personal domain records explicitly support a nullable Lab scope", () => {
  const meetingDomain = read("lib/meetings/meeting-domain.ts");
  const actionDomain = read("lib/meeting-actions/action-domain.ts");
  const meetingData = read("lib/meetings/meeting-data.ts");
  const actionData = read("lib/meeting-actions/action-data.ts");
  assert.match(meetingDomain, /lab_id: string \| null/);
  assert.match(actionDomain, /lab_id: string \| null/);
  assert.match(meetingData, /filter\(\(labId\): labId is string => Boolean\(labId\)\)/);
  assert.match(actionData, /filter\(\(labId\): labId is string => Boolean\(labId\)\)/);
});
