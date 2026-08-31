import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { deriveAttention, sortAttentionStudents, type AttentionWeekly } from "../lib/professor/attention";

const root = process.cwd();
const now = new Date("2026-08-31T04:00:00Z");

function weekly(overrides: Partial<AttentionWeekly> = {}): AttentionWeekly {
  return {
    weekStart: "2026-08-31",
    completedSummary: "本週完成研究整理",
    blockers: null,
    nextPlan: "下週繼續",
    selfStatus: "on_track",
    needsProfessorHelp: "no",
    updatedAt: "2026-08-30T04:00:00Z",
    ...overrides,
  };
}

function student(overrides: Partial<Parameters<typeof deriveAttention>[0]> = {}) {
  return deriveAttention({
    studentId: "student-1",
    labId: "lab-1",
    labName: "Lab A",
    name: "Student",
    degree: "PhD",
    researchArea: "materials",
    joinedAt: "2026-08-01T04:00:00Z",
    weekly: weekly(),
    overdueActionCount: 0,
    deadlineSoonCount: 0,
    nextMeetingAt: null,
    lastCompletedMeetingAt: null,
    latestAuditRisk: null,
    now,
    ...overrides,
  });
}

test("Attention derives the required severity and signal rules", () => {
  assert.equal(student().severity, "healthy");
  assert.deepEqual(student({ weekly: null, joinedAt: "2026-08-29T04:00:00Z" }).signals, []);
  assert.deepEqual(student({ weekly: null, joinedAt: "2026-08-23T04:00:00Z" }).signals, ["no_recent_update"]);
  assert.equal(student({ weekly: null, joinedAt: "2026-08-16T04:00:00Z" }).signals[0], "update_overdue");
  assert.equal(student({ weekly: weekly({ selfStatus: "slightly_behind" }) }).severity, "attention");
  assert.equal(student({ weekly: weekly({ selfStatus: "blocked" }) }).severity, "urgent");
  assert.equal(student({ weekly: weekly({ needsProfessorHelp: "soon" }) }).signals[0], "help_soon");
});

test("Attention derives action, audit and meeting signals without false positives", () => {
  assert.ok(student({ overdueActionCount: 1 }).signals.includes("overdue_action"));
  assert.ok(student({ deadlineSoonCount: 1 }).signals.includes("deadline_soon"));
  assert.ok(student({ latestAuditRisk: "high" }).signals.includes("high_risk"));
  assert.ok(student({ lastCompletedMeetingAt: "2026-08-01T04:00:00Z" }).signals.includes("no_recent_meeting"));
  assert.ok(!student({ lastCompletedMeetingAt: "2026-08-01T04:00:00Z", nextMeetingAt: "2026-09-03T04:00:00Z" }).signals.includes("no_recent_meeting"));
  assert.equal(student({ overdueActionCount: 1, latestAuditRisk: "high" }).signals[0], "overdue_action");
});

test("Attention uses Taipei calendar boundaries", () => {
  const beforeTaipeiMonday = new Date("2026-08-30T15:59:59Z");
  const afterTaipeiMonday = new Date("2026-08-30T16:00:00Z");
  assert.deepEqual(student({ now: beforeTaipeiMonday, weekly: weekly({ updatedAt: "2026-08-23T15:59:59Z" }) }).signals, ["no_recent_update"]);
  assert.deepEqual(student({ now: afterTaipeiMonday, weekly: weekly({ updatedAt: "2026-08-23T16:00:00Z" }) }).signals, ["no_recent_update"]);
});

test("Attention sorting follows severity then configured signal priority", () => {
  const behind = student({ studentId: "behind", weekly: weekly({ selfStatus: "slightly_behind" }) });
  const blocked = student({ studentId: "blocked", weekly: weekly({ selfStatus: "blocked" }) });
  const help = student({ studentId: "help", weekly: weekly({ needsProfessorHelp: "soon" }) });
  assert.deepEqual(sortAttentionStudents([behind, blocked, help]).map((item) => item.studentId), ["help", "blocked", "behind"]);
});

test("Attention page is scoped to supervisor data and contains no mutation or raw PDF path", () => {
  const page = readFileSync(`${root}/app/professor/attention/page.tsx`, "utf8");
  const loader = readFileSync(`${root}/lib/professor/attention-data.ts`, "utf8");
  assert.match(page, /requireProfessorWorkspace/);
  assert.match(page, /loadProfessorAttentionData/);
  assert.match(loader, /weekly_updates/);
  assert.match(loader, /meetings/);
  assert.match(loader, /meeting_actions/);
  assert.match(loader, /get_shared_audit_summaries/);
  assert.doesNotMatch(loader, /insert\(|update\(|delete\(/);
  assert.doesNotMatch(loader, /storage\.from|signedUrl|result_markdown|input_prompt/);
});

test("Professor dashboard limits management controls to owned Labs", () => {
  const dashboard = readFileSync(`${root}/app/professor/dashboard/page.tsx`, "utf8");
  const workspace = readFileSync(`${root}/components/workspace/ProfessorWorkspaceHome.tsx`, "utf8");
  const billing = readFileSync(`${root}/app/billing/page.tsx`, "utf8");
  assert.match(dashboard, /canManage=\{profile\.role === "professor" && ownedLabs\.length > 0\}/);
  assert.match(dashboard, /profile\.role === "professor" && ownedLabs\.length > 0 \?\s*\(/);
  assert.match(workspace, /canManage \? <Link href="\/billing"/);
  assert.match(billing, /eq\("owner_professor_id", user\.id\)/);
  assert.match(billing, /if \(!ownedLab\) redirect\("\/professor\/dashboard"\)/);
});
