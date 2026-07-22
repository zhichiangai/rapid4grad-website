import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

function readRepoFile(path: string) {
  return readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");
}

const migration = readRepoFile(
  "supabase/migrations/20260722185659_admin_control_plane.sql",
);
const actions = readRepoFile("app/admin/actions.ts");
const authorization = readRepoFile("lib/admin/authorization.ts");
const snapshotSanitizer = readRepoFile("lib/admin/safe-snapshots.ts");

const adminRoutes = [
  "users",
  "entitlements",
  "labs",
  "subscriptions",
  "orders",
  "pdf-credits",
  "action-logs",
];

test("Task 8 exposes all required Admin routes", () => {
  for (const route of adminRoutes) {
    assert.equal(
      existsSync(fileURLToPath(new URL(`../app/admin/${route}/page.tsx`, import.meta.url))),
      true,
      `missing /admin/${route}`,
    );
  }
});

test("all high-privilege Admin RPCs are service-role only", () => {
  const functions = [
    "admin_update_profile_role",
    "admin_update_account_status",
    "admin_grant_course_entitlement",
    "admin_revoke_course_entitlement",
    "admin_extend_subscription",
    "admin_compensate_pdf_credits",
    "admin_update_lead_status",
    "admin_unlock_free_usage_quota",
    "admin_update_prompt_template",
  ];
  for (const name of functions) {
    assert.match(migration, new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}`));
    const revoke = migration.match(
      new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}[\\s\\S]*?;`),
    )?.[0];
    assert.ok(revoke, `${name} must revoke browser execution`);
    assert.match(revoke, /PUBLIC, anon, authenticated/);
  }
  assert.doesNotMatch(migration, /GRANT EXECUTE[\s\S]*TO authenticated/);
});

test("Admin mutations recheck active Admin and log atomically", () => {
  assert.match(authorization, /auth\.getUser\(\)/);
  assert.match(authorization, /profile\.role !== "admin"/);
  assert.match(authorization, /profile\.account_status !== "active"/);
  assert.match(migration, /app_private\.assert_admin_operation/);
  assert.equal(
    (migration.match(/PERFORM public\.record_admin_action\(/g) ?? []).length,
    9,
  );
  assert.doesNotMatch(actions, /\.from\([^)]+\)\s*\.(?:insert|update|delete|upsert)/);
  assert.match(actions, /randomUUID\(\)/);
});

test("approved product rules are enforced in the database", () => {
  assert.match(migration, /target_role NOT IN[\s\S]*'student'[\s\S]*'professor'/);
  assert.match(migration, /selected_profile\.role = 'admin'/);
  assert.match(migration, /target_extension_days < 1[\s\S]*target_extension_days > 30/);
  assert.match(migration, /'active'[\s\S]*'trialing'[\s\S]*'past_due'/);
  assert.match(migration, /target_credit_amount < 1[\s\S]*target_credit_amount > 100/);
  assert.match(migration, /SET pdf_audit_limit = pdf_audit_limit \+ target_credit_amount/);
  assert.doesNotMatch(migration, /SET[\s\S]{0,120}pdf_audit_used\s*=/);
  assert.doesNotMatch(migration, /SET[\s\S]{0,120}pdf_audit_reserved\s*=/);
});

test("Admin UI does not query private PDF or raw audit tables", () => {
  const routeSource = adminRoutes
    .map((route) => readRepoFile(`app/admin/${route}/page.tsx`))
    .join("\n");
  assert.doesNotMatch(routeSource, /\.from\("student_documents"\)/);
  assert.doesNotMatch(routeSource, /\.from\("ai_audit_jobs"\)/);
  assert.doesNotMatch(routeSource, /\.from\("ai_audit_results"\)/);
  assert.doesNotMatch(routeSource, /input_prompt|result_markdown|storage_path|raw_payload|raw_checkout_payload/);
});

test("Action log rendering applies a strict snapshot allowlist", () => {
  assert.match(snapshotSanitizer, /SAFE_ADMIN_SNAPSHOT_KEYS/);
  for (const forbidden of [
    "input_prompt",
    "result_markdown",
    "storage_path",
    "raw_payload",
    "token_input",
    "token_output",
  ]) {
    assert.doesNotMatch(snapshotSanitizer, new RegExp(`\\b${forbidden}\\b`));
  }
});

test("every mutation requires a reason and second confirmation", () => {
  assert.match(actions, /reason\.length < 3/);
  assert.match(actions, /confirmation !== expectedConfirmation/);
  const confirmation = readRepoFile("components/admin/AdminConfirmAction.tsx");
  assert.match(confirmation, /requestSubmit\(\)/);
  assert.match(confirmation, /再次確認並執行/);
});
