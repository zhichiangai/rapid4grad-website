import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../supabase/migrations_legacy/20260711153412_restrict_shared_audit_access_to_summaries.sql",
    import.meta.url,
  ),
  "utf8",
);

test("summary RPC exposes only the fixed seven-column contract", () => {
  const returnsBlock = migration.match(/RETURNS TABLE \(([\s\S]*?)\)\nLANGUAGE sql/);
  assert.ok(returnsBlock);
  const columns = [...returnsBlock[1].matchAll(/^\s*([a-z_]+)\s+/gm)].map(
    (match) => match[1],
  );
  assert.deepEqual(columns, [
    "job_id",
    "student_user_id",
    "summary",
    "risk_level",
    "issue_tags",
    "completed_at",
    "created_at",
  ]);
});

test("summary RPC enforces consent, Lab membership, and revocation", () => {
  assert.match(migration, /share\.revoked_at IS NULL/);
  assert.match(migration, /viewer\.lab_id = target_lab_id/);
  assert.match(migration, /viewer\.role IN \('professor', 'assistant'\)/);
  assert.match(migration, /viewer\.status = 'active'/);
});

test("raw audit authorization is restricted to owner or admin", () => {
  const helper = migration.match(
    /CREATE OR REPLACE FUNCTION public\.app_can_read_ai_audit_job[\s\S]*?\$\$;/,
  );
  assert.ok(helper);
  assert.doesNotMatch(helper[0], /audit_summary_shares|lab_memberships/);
  assert.match(helper[0], /job\.user_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(helper[0], /public\.app_is_admin\(\)/);
});
