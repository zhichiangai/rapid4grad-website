import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  getCurrentThesisMilestone,
  getThesisProgressSummary,
  mergeMilestoneDefinitionsWithRows,
  THESIS_MILESTONES,
} from "../lib/thesis-progress/thesis-domain";

test("Thesis Progress provides eight canonical milestones and first-use defaults", () => {
  const milestones = mergeMilestoneDefinitionsWithRows("student-a", []);
  assert.equal(milestones.length, 8);
  assert.equal(milestones[0].key, "research_direction");
  assert.equal(milestones[7].key, "defense_graduation");
  assert.equal(getThesisProgressSummary(milestones).completedCount, 0);
  assert.equal(getThesisProgressSummary(milestones).current?.key, "research_direction");
});

test("Thesis Progress derives blocked, in-progress, and next-stage priority", () => {
  const milestones = mergeMilestoneDefinitionsWithRows("student-a", [
    { student_user_id: "student-a", milestone_key: "research_execution", status: "completed", target_date: null, note: null, completed_at: "2026-08-01T00:00:00Z" },
    { student_user_id: "student-a", milestone_key: "proposal", status: "blocked", target_date: null, note: "待確認", completed_at: null },
    { student_user_id: "student-a", milestone_key: "methodology", status: "in_progress", target_date: null, note: null, completed_at: null },
  ]);
  assert.equal(getThesisProgressSummary(milestones).current?.key, "proposal");
  assert.equal(getThesisProgressSummary(milestones).completedCount, 1);
});

test("Thesis Progress allows out-of-order completion and all-complete state", () => {
  const rows = THESIS_MILESTONES.map((milestone) => ({ student_user_id: "student-a", milestone_key: milestone.key, status: "completed" as const, target_date: null, note: null, completed_at: "2026-08-01T00:00:00Z" }));
  const milestones = mergeMilestoneDefinitionsWithRows("student-a", rows);
  assert.equal(getCurrentThesisMilestone(milestones), null);
  assert.equal(getThesisProgressSummary(milestones).completedCount, 8);
});

test("Thesis Progress server boundary derives identity and has no delete path", () => {
  const actions = fs.readFileSync("app/dashboard/thesis/actions.ts", "utf8");
  assert.match(actions, /requireStudentWorkspace/);
  assert.match(actions, /expected_updated_at/);
  assert.match(actions, /updated_at.*expectedUpdatedAt|expectedUpdatedAt.*updated_at/);
  assert.match(actions, /這個里程碑已被其他人更新/);
  assert.match(actions, /student_user_id: context\.user\.id/);
  assert.match(actions, /\.update\(\{[\s\S]*status/);
  assert.match(actions, /\.insert\(\{[\s\S]*student_user_id: context\.user\.id/);
  assert.doesNotMatch(actions, /\.delete\(/);
  assert.doesNotMatch(actions, /student_user_id.*formData/);
  const card = fs.readFileSync("components/thesis-progress/ThesisMilestoneCard.tsx", "utf8");
  assert.match(card, /name="expected_updated_at"/);
});

test("Thesis Progress migration keeps data student-private and identity immutable", () => {
  const migration = fs.readFileSync("supabase/migrations/20260831182930_add_thesis_milestones_v1.sql", "utf8");
  assert.match(migration, /CREATE TABLE public\.thesis_milestones/);
  assert.match(migration, /student_user_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(migration, /GRANT UPDATE \(status, target_date, note\)/);
  assert.match(migration, /REVOKE UPDATE, DELETE ON TABLE public\.thesis_milestones FROM authenticated/);
  assert.doesNotMatch(migration, /CREATE POLICY[^;]+TO authenticated[\s\S]+professor/i);
  assert.doesNotMatch(migration, /CREATE POLICY[^;]+TO authenticated[\s\S]+assistant/i);
  assert.doesNotMatch(migration, /CREATE POLICY[^;]+TO authenticated[\s\S]+admin/i);
  assert.match(migration, /thesis_milestones_completion_consistency/);
});
