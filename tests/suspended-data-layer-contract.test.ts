import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

function readSource(path: string) {
  return readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
}

const migration = readSource(
  "../supabase/migrations/20260828090001_suspended_data_layer_enforcement.sql",
);
const integration = readSource("../supabase/tests/permission_foundation_integration.sql");

test("suspended data-layer migration preserves public content and closes private RLS", () => {
  for (const policy of [
    "student_documents_select_active_owner",
    "ai_audit_jobs_select_active_owner",
    "ai_audit_results_select_active_owner",
    "course_progress_select_active_owner",
    "orders_select_active_owner_or_admin",
    "labs_select_active_member_owner_or_admin",
    "student_documents_storage_select_active_owner",
    "ai_audit_exports_storage_select_active_owner",
  ]) {
    assert.match(migration, new RegExp(`CREATE POLICY "${policy}"`));
  }

  assert.match(migration, /course_lessons_select_active_authenticated_access/);
  assert.doesNotMatch(migration, /DROP POLICY IF EXISTS "course_lessons_select_public_preview"/);
  assert.match(migration, /profiles_select_self_or_active_admin/);
  assert.match(migration, /profiles_update_active_self/);
  assert.match(migration, /Existing signed URLs can remain usable until their normal expiration/);
});

test("local integration fixture validates role transitions and suspended RLS behavior", () => {
  assert.match(integration, /active_student_membership_blocks_professor_role/);
  assert.match(integration, /professor_resources_block_student_role/);
  assert.match(integration, /suspended user must retain profile self-read/);
  assert.match(integration, /suspended user must not read private document metadata/);
  assert.match(integration, /course_lessons_select_public_preview/);
});

test("SECURITY DEFINER RPCs enforce active accounts before private reads", () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.get_my_lab_pdf_credit_balance/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.get_shared_audit_summaries/);
  assert.match(migration, /IF NOT app_private\.is_active_user\(selected_user_id\)/);
  assert.match(migration, /RAISE EXCEPTION 'account_suspended'/);
  assert.match(
    migration,
    /IF NOT app_private\.is_active_user\(selected_user_id\)[\s\S]*RETURN QUERY/,
  );
  assert.match(integration, /get_my_lab_pdf_credit_balance/);
  assert.match(integration, /get_shared_audit_summaries/);
});
