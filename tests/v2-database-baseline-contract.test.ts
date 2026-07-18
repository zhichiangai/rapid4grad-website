import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

function readMigration(filename: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../supabase/migrations/${filename}`, import.meta.url)),
    "utf8",
  );
}

const labs = readMigration("005_labs_subscriptions_and_seats.sql");
const audit = readMigration("006_documents_ai_audit_and_consent.sql");
const access = readMigration("007_grants_rls_storage_and_seed.sql");

test("V2 baseline enforces Lab ownership, membership, and subscription invariants", () => {
  assert.match(labs, /labs_one_active_per_owner_unique/);
  assert.match(labs, /lab_memberships_one_active_lab_per_student_unique/);
  assert.match(labs, /subscriptions_one_current_per_lab_unique/);
  assert.match(labs, /active_count >= 3/);
  assert.match(labs, /professor_lab_standard[\s\S]*?THEN 15/);
  assert.match(labs, /professor_lab_plus[\s\S]*?THEN 30/);
  assert.match(labs, /FOR UPDATE/);
});

test("V2 course entitlement is permanent and independent of Lab membership", () => {
  const payments = readMigration("003_products_payments_and_entitlements.sql");
  assert.match(payments, /entitlement_type <> 'course_full' OR ends_at IS NULL/);
  assert.match(payments, /grant_course_entitlement_for_order/);
  assert.match(access, /has_active_course_full/);
});

test("V2 audit credits use reserve, settle, and refund transactions", () => {
  assert.match(audit, /reserve_lab_pdf_audit_credit/);
  assert.match(audit, /pdf_audit_reserved = pdf_audit_reserved \+ 1/);
  assert.match(audit, /complete_lab_pdf_audit_job/);
  assert.match(audit, /pdf_audit_used = pdf_audit_used \+ 1/);
  assert.match(audit, /fail_lab_pdf_audit_job/);
  assert.match(audit, /credit_state = 'refunded'/);
});

test("V2 shared summaries expose exactly seven safe fields", () => {
  const returnsBlock = audit.match(
    /CREATE OR REPLACE FUNCTION public\.get_shared_audit_summaries[\s\S]*?RETURNS TABLE \(([\s\S]*?)\)\nLANGUAGE sql/,
  );
  assert.ok(returnsBlock);
  const fields = [...returnsBlock[1].matchAll(/^\s*([a-z_]+)\s+/gm)].map(
    (match) => match[1],
  );
  assert.deepEqual(fields, [
    "job_id",
    "student_user_id",
    "summary",
    "risk_level",
    "issue_tags",
    "completed_at",
    "created_at",
  ]);
  assert.match(audit, /share\.revoked_at IS NULL/);
  assert.doesNotMatch(returnsBlock[0], /result_markdown|input_prompt|token_input|storage_path/);
});

test("V2 raw PDF and audit policies are owner-only", () => {
  assert.match(access, /student_documents_select_owner/);
  assert.match(access, /ai_audit_jobs_select_owner/);
  assert.match(access, /ai_audit_results_select_owner/);
  assert.doesNotMatch(
    access.match(/CREATE POLICY "student_documents_select_owner"[\s\S]*?;/)?.[0] ?? "",
    /is_admin|owns_lab|is_active_lab_member/,
  );
  assert.doesNotMatch(
    access.match(/CREATE POLICY "ai_audit_results_select_owner"[\s\S]*?;/)?.[0] ?? "",
    /is_admin|owns_lab|is_active_lab_member/,
  );
});

test("V2 profile mutations are restricted to safe columns", () => {
  const grant = access.match(/GRANT UPDATE \(([\s\S]*?)\)\n\s*ON public\.profiles/);
  assert.ok(grant);
  assert.match(grant[1], /full_name/);
  assert.doesNotMatch(grant[1], /role|is_paid|paid_at|course_expires_at|account_status/);
});

test("V2 private Storage policies isolate objects by owner path", () => {
  assert.match(access, /'student-documents', 'student-documents', FALSE/);
  assert.match(access, /'ai-audit-exports', 'ai-audit-exports', FALSE/);
  assert.match(access, /\(storage\.foldername\(name\)\)\[1\] = \(SELECT auth\.uid\(\)\)::TEXT/);
  assert.doesNotMatch(
    access.match(/student_documents_storage_select_owner[\s\S]*?;/)?.[0] ?? "",
    /is_admin|owns_lab|lab_memberships/,
  );
});
