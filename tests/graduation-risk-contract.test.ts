import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  deriveGraduationRiskSignals,
  deriveGraduationRiskStatus,
  getPrimaryGraduationRiskSignal,
} from "../lib/graduation-risk/risk-domain";

const base = { activeLab: true, joinedAt: "2026-08-01T00:00:00Z", latestWeekly: null, meetings: [], actions: [], thesisMilestones: [] };
const action = (overrides: Record<string, unknown> = {}) => ({ status: "todo", due_date: null, owner_type: "student", owner_user_id: "student-a", student_user_id: "student-a", ...overrides });

test("Graduation Risk derives the frozen signal rules and Taipei boundaries", () => {
  const signals = deriveGraduationRiskSignals({ ...base, joinedAt: "2026-09-01T00:00:00Z", today: "2026-09-05", latestWeekly: { updated_at: "2026-08-29T00:00:00Z" }, actions: [action({ due_date: "2026-09-04" }), action({ due_date: "2026-09-12" })], thesisMilestones: [{ milestone_key: "proposal", status: "blocked", target_date: "2026-09-20" }, { milestone_key: "methodology", status: "in_progress", target_date: "2026-09-12" }] });
  assert.deepEqual(signals.map((signal) => signal.key), ["thesis_blocked", "overdue_action", "no_recent_update", "deadline_soon", "thesis_target_soon"]);
  assert.equal(signals.find((signal) => signal.key === "deadline_soon")?.severity, "attention");
  assert.equal(getPrimaryGraduationRiskSignal(signals)?.key, "thesis_blocked");
});

test("Supervisor-owned and completed/canceled actions never become student risk", () => {
  const signals = deriveGraduationRiskSignals({ ...base, today: "2026-09-05", actions: [action({ owner_type: "supervisor", owner_user_id: "professor-a", due_date: "2026-09-01" }), action({ status: "done", completed_at: "2026-09-01T00:00:00Z", due_date: "2026-09-01" }), action({ status: "canceled", due_date: "2026-09-01" })] });
  assert.equal(signals.some((signal) => signal.key === "overdue_action"), false);
});

test("Graduation Risk differentiates weekly stale windows, thesis targets, meeting gaps and priority", () => {
  const weekly = deriveGraduationRiskSignals({ ...base, joinedAt: "2026-09-01T00:00:00Z", today: "2026-09-05", latestWeekly: { updated_at: "2026-08-22T00:00:00Z" } });
  assert.equal(weekly[0].key, "update_overdue");
  const target = deriveGraduationRiskSignals({ ...base, today: "2026-09-05", thesisMilestones: [{ milestone_key: "proposal", status: "in_progress", target_date: "2026-09-02" }] });
  assert.equal(target[0].key, "thesis_target_overdue");
  assert.equal(target[0].severity, "attention");
  const meeting = deriveGraduationRiskSignals({ ...base, today: "2026-09-05", now: new Date("2026-09-05T00:00:00Z"), joinedAt: "2026-08-01T00:00:00Z", latestWeekly: { updated_at: "2026-09-05T00:00:00Z" } });
  assert.equal(meeting[0].key, "no_recent_meeting");
  const upcoming = deriveGraduationRiskSignals({ ...base, today: "2026-09-05", now: new Date("2026-09-05T00:00:00Z"), joinedAt: "2026-08-01T00:00:00Z", latestWeekly: { updated_at: "2026-09-05T00:00:00Z" }, meetings: [{ status: "scheduled", meeting_at: "2026-09-06T00:00:00Z" }] });
  assert.equal(upcoming.length, 0);
});

test("Graduation Risk overall status includes stable and setup_needed without scores", () => {
  assert.equal(deriveGraduationRiskStatus({ signals: [], hasThesisRows: false, activeLab: false }), "setup_needed");
  assert.equal(deriveGraduationRiskStatus({ signals: [], hasThesisRows: true, activeLab: false }), "stable");
  assert.equal(deriveGraduationRiskStatus({ signals: [{ key: "no_recent_meeting", severity: "attention", title: "", reason: "", recommendation: "", href: "/dashboard/meetings", source: "meetings" }], hasThesisRows: true, activeLab: true }), "attention");
  assert.equal(deriveGraduationRiskStatus({ signals: [{ key: "thesis_blocked", severity: "urgent", title: "", reason: "", recommendation: "", href: "/dashboard/thesis", source: "thesis" }], hasThesisRows: true, activeLab: true }), "urgent");
});

test("Graduation Risk is a student-only authenticated server boundary with zero migration", () => {
  const page = fs.readFileSync("app/dashboard/graduation-risk/page.tsx", "utf8");
  const data = fs.readFileSync("lib/graduation-risk/risk-data.ts", "utf8");
  assert.match(page, /loadStudentGraduationRisk/);
  assert.match(page, /deriveGraduationRiskSignals/);
  assert.match(data, /requireStudentWorkspace/);
  assert.match(data, /context\.supabase/);
  assert.doesNotMatch(data, /createV2AdminClient|createAdminClient/);
  assert.doesNotMatch(page, /createV2AdminClient|createAdminClient/);
  assert.equal(fs.readdirSync("supabase/migrations").length, 19);
});

test("Graduation Risk UI contains required copy, navigation and compact dashboard card", () => {
  const overview = fs.readFileSync("components/graduation-risk/GraduationRiskOverview.tsx", "utf8");
  const navigation = fs.readFileSync("components/workspace/StudentWorkspaceNavigation.tsx", "utf8");
  const home = fs.readFileSync("components/workspace/StudentWorkspaceHome.tsx", "utf8");
  assert.match(overview, /GRADUATION NAVIGATION/);
  assert.match(overview, /畢業風險/);
  assert.match(overview, /不是學校正式畢業資格判定，也不是畢業機率預測/);
  assert.match(overview, /為什麼 RAPID 這樣判斷/);
  assert.match(overview, /設定論文進度/);
  assert.match(navigation, /graduation-risk/);
  assert.match(home, /畢業風險/);
  assert.match(home, /\/dashboard\/graduation-risk/);
});
