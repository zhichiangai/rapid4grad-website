import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

function readRepoFile(path: string) {
  return readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");
}

const migration = readRepoFile(
  "supabase/migrations/20260719152137_lab_pdf_shared_pool.sql",
);
const storageRestrictionMigration = readRepoFile(
  "supabase/migrations/20260719155719_restrict_student_document_uploads_to_signed_urls.sql",
);
const auditRoute = readRepoFile("app/api/ai/audit/route.ts");
const uploadRoute = readRepoFile("app/api/documents/upload-url/route.ts");
const completeRoute = readRepoFile("app/api/documents/complete/route.ts");
const shareRoute = readRepoFile("app/api/documents/share/route.ts");
const auditPage = readRepoFile("app/dashboard/ai-audit/page.tsx");
const streamingPanel = readRepoFile(
  "components/ai-audit/AuditStreamingPanel.tsx",
);

test("Task 7 defines monthly non-rollover Standard and Plus shared pools", () => {
  assert.match(migration, /pdf_audit_limit_per_month\":30/);
  assert.match(migration, /pdf_audit_limit_per_month\":100/);
  assert.match(migration, /pdf_audit_rollover\":false/);
  assert.match(migration, /ensure_lab_pdf_credit_period/);
  assert.match(migration, /make_interval\(months => month_index \+ 1\)/);
  assert.match(migration, /pdfAuditLimitOverride/);
  assert.doesNotMatch(migration, /overage|credit_pack|rollover_balance/);
});

test("Task 7 reserves one shared credit atomically and idempotently", () => {
  assert.match(migration, /reserve_lab_pdf_audit_job/);
  assert.match(migration, /target_idempotency_key UUID/);
  assert.match(migration, /ai_audit_jobs_user_idempotency_unique/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /pdf_audit_reserved = pdf_audit_reserved \+ 1/);
  assert.match(migration, /RETURN QUERY SELECT existing_job\.id, FALSE/);
  assert.match(migration, /TO service_role/);
  assert.doesNotMatch(
    migration.match(
      /GRANT EXECUTE ON FUNCTION public\.reserve_lab_pdf_audit_job[\s\S]*?;/,
    )?.[0] ?? "",
    /authenticated|anon/,
  );
});

test("Task 7 eligibility is student plus active membership plus functional subscription", () => {
  const ensureFunction = migration.match(
    /CREATE OR REPLACE FUNCTION app_private\.ensure_lab_pdf_credit_period[\s\S]*?\$\$;/,
  )?.[0];
  assert.ok(ensureFunction);
  assert.match(ensureFunction, /profile\.role = 'student'/);
  assert.match(ensureFunction, /membership\.role = 'student'/);
  assert.match(ensureFunction, /membership\.status = 'active'/);
  assert.match(ensureFunction, /subscription_is_functional/);
  assert.match(ensureFunction, /lab\.status = 'active'/);
});

test("AI route is owner-only and uses server Base64 PDF multimodal input", () => {
  assert.match(auditRoute, /\.eq\("user_id", user\.id\)/);
  assert.match(auditRoute, /bytes\.toString\("base64"\)/);
  assert.match(auditRoute, /type: "file"/);
  assert.match(auditRoute, /mediaType: "application\/pdf"/);
  assert.match(auditRoute, /reserveLabPdfAuditJob/);
  assert.doesNotMatch(auditRoute, /canAccessDocument|\["professor", "assistant"\]/);
  assert.doesNotMatch(auditRoute, /signedUrl|publicUrl|ai_usage_credits/);
});

test("stream completion waits for settlement and failures await refunds", () => {
  assert.match(auditRoute, /new ReadableStream<Uint8Array>/);
  assert.match(auditRoute, /for await \(const textDelta of result\.textStream\)/);
  assert.match(auditRoute, /const outcome = await streamOutcome/);
  assert.match(auditRoute, /await persistCompletedAudit/);
  assert.match(auditRoute, /await refundReservedAudit/);
  assert.match(auditRoute, /controller\.close\(\)/);
  assert.match(auditRoute, /abortSignal: modelAbortController\.signal/);
  assert.doesNotMatch(auditRoute, /void persist|void refund/);
  assert.match(streamingPanel, /AbortController/);
  assert.match(streamingPanel, /停止並退回預留額度/);
});

test("signed upload and completion validate actual private PDF metadata", () => {
  assert.match(uploadRoute, /auth\.getUser\(\)/);
  assert.match(uploadRoute, /getLabPdfAuditEligibility/);
  assert.match(uploadRoute, /createV2AdminClient\(\)/);
  assert.match(uploadRoute, /createSignedUploadUrl/);
  assert.match(completeRoute, /getLabPdfAuditEligibility/);
  assert.match(completeRoute, /\.list\(folderPath/);
  assert.match(completeRoute, /metadataMime === "application\/pdf"/);
  assert.match(completeRoute, /metadataSize === bytes\.length/);
  assert.match(completeRoute, /PDF_MAGIC/);
  assert.match(completeRoute, /createHash\("sha256"\)/);
  assert.match(completeRoute, /await deleteObject\(\)/);
  assert.doesNotMatch(completeRoute, /lab_id: null/);
});

test("direct authenticated Storage writes are disabled in favor of server-issued tokens", () => {
  assert.match(
    storageRestrictionMigration,
    /DROP POLICY IF EXISTS "student_documents_storage_insert_owner"/,
  );
  assert.match(
    storageRestrictionMigration,
    /DROP POLICY IF EXISTS "student_documents_storage_update_owner"/,
  );
  assert.doesNotMatch(
    storageRestrictionMigration,
    /DROP POLICY IF EXISTS "student_documents_storage_select_owner"/,
  );
  assert.doesNotMatch(
    storageRestrictionMigration,
    /DROP POLICY IF EXISTS "student_documents_storage_delete_owner"/,
  );
});

test("student page and sharing route use V2 Lab boundaries", () => {
  assert.match(auditPage, /getLabPdfAuditEligibility/);
  assert.match(auditPage, /\.eq\("role", "student"\)/);
  assert.match(auditPage, /Lab 共用額度/);
  assert.match(shareRoute, /grant_audit_summary_consent/);
  assert.match(shareRoute, /revoke_audit_summary_consent/);
  assert.doesNotMatch(shareRoute, /audit_summary_shares"\)\.upsert/);
});
