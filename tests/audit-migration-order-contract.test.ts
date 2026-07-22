import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

function readMigration(filename: string): string {
  return readFileSync(
    fileURLToPath(
      new URL(`../supabase/migrations_legacy/${filename}`, import.meta.url),
    ),
    "utf8",
  );
}

const auditRlsMigration = readMigration(
  "20260711071816_fix_ai_audit_rls_recursion.sql",
);
const consentMigration = readMigration(
  "20260711074505_add_audit_summary_sharing_consent.sql",
);
const emailMigration = readMigration(
  "20260711074936_make_email_challenge_limits_atomic.sql",
);
const summaryMigration = readMigration(
  "20260711153412_restrict_shared_audit_access_to_summaries.sql",
);

test("audit RLS migration restricts raw document and audit rows to owner/admin", () => {
  const documentHelper = auditRlsMigration.match(
    /CREATE OR REPLACE FUNCTION public\.app_can_read_student_document[\s\S]*?\$\$;/,
  );
  const auditHelper = auditRlsMigration.match(
    /CREATE OR REPLACE FUNCTION public\.app_can_read_ai_audit_job[\s\S]*?\$\$;/,
  );

  assert.ok(documentHelper);
  assert.ok(auditHelper);
  assert.match(documentHelper[0], /document\.user_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(documentHelper[0], /public\.app_is_admin\(\)/);
  assert.doesNotMatch(documentHelper[0], /lab_memberships|professor|assistant/);
  assert.match(auditHelper[0], /job\.user_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(auditHelper[0], /public\.app_is_admin\(\)/);
  assert.doesNotMatch(auditHelper[0], /lab_memberships|professor|assistant/);
});

test("consent migration never grants professor raw audit access", () => {
  assert.match(consentMigration, /CREATE TABLE public\.audit_summary_shares/);
  assert.doesNotMatch(
    consentMigration,
    /CREATE OR REPLACE FUNCTION public\.app_can_read_ai_audit_job/,
  );
  assert.doesNotMatch(
    consentMigration,
    /CREATE POLICY[^\n]*(ai_audit_jobs|ai_audit_results)/,
  );
  assert.match(
    consentMigration,
    /DROP POLICY IF EXISTS "storage student-documents: lab professor can read"/,
  );
});

test("email migration cannot change audit or consent authorization", () => {
  assert.doesNotMatch(
    emailMigration,
    /ai_audit_jobs|ai_audit_results|student_documents|audit_summary_shares/,
  );
});

test("summary migration exposes only seven fields and preserves owner/admin raw helper", () => {
  const returnsBlock = summaryMigration.match(
    /RETURNS TABLE \(([\s\S]*?)\)\nLANGUAGE sql/,
  );
  const rawHelper = summaryMigration.match(
    /CREATE OR REPLACE FUNCTION public\.app_can_read_ai_audit_job[\s\S]*?\$\$;/,
  );

  assert.ok(returnsBlock);
  assert.ok(rawHelper);
  const returnedColumns = returnsBlock[1]
    .split(",")
    .map((column) => column.trim().split(/\s+/)[0]);

  assert.deepEqual(returnedColumns, [
    "job_id",
    "student_user_id",
    "summary",
    "risk_level",
    "issue_tags",
    "completed_at",
    "created_at",
  ]);
  assert.match(rawHelper[0], /job\.user_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(rawHelper[0], /public\.app_is_admin\(\)/);
  assert.doesNotMatch(rawHelper[0], /audit_summary_shares|lab_memberships/);
});
