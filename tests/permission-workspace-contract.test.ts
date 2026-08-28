import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

function readSource(path: string) {
  return readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
}

const middleware = readSource("../middleware.ts");
const authorization = readSource("../lib/auth/authorization.ts");
const dashboardLayout = readSource("../app/dashboard/layout.tsx");
const professorLayout = readSource("../app/professor/layout.tsx");
const hardeningMigration = readSource(
  "../supabase/migrations/20260828090000_permission_foundation_hardening.sql",
);

const protectedApiRoutes = [
  "../app/api/ai/audit/route.ts",
  "../app/api/course/progress/route.ts",
  "../app/api/documents/upload-url/route.ts",
  "../app/api/documents/complete/route.ts",
  "../app/api/documents/share/route.ts",
  "../app/api/labs/route.ts",
  "../app/api/labs/join/route.ts",
  "../app/api/labs/invite/route.ts",
  "../app/api/labs/members/route.ts",
  "../app/api/billing/checkout/route.ts",
  "../app/api/billing/cancel/route.ts",
  "../app/api/billing/trial/route.ts",
  "../app/api/payments/checkout/route.ts",
  "../app/api/payments/orders/[orderId]/route.ts",
];

test("middleware protects every workspace and loads the profile once", () => {
  assert.match(middleware, /matcher: \["\/dashboard\/:path\*", "\/admin\/:path\*", "\/professor\/:path\*"\]/);
  assert.match(middleware, /\.select\("role,account_status"\)/);
  assert.equal((middleware.match(/\.select\("role,account_status"\)/g) ?? []).length, 1);
  assert.match(middleware, /profile\.account_status !== "active"/);
  assert.match(middleware, /pathname = "\/account-suspended"/);
  assert.match(middleware, /profile\.role === "professor" \? "\/professor\/dashboard" : "\/dashboard"/);
});

test("shared guards fail closed for suspended, missing, and unauthenticated users", () => {
  for (const guard of [
    "requireActiveUser",
    "requireStudentWorkspace",
    "requireProfessorWorkspace",
    "getActiveApiUser",
  ]) {
    assert.match(authorization, new RegExp(`export async function ${guard}`));
  }

  assert.match(authorization, /account_status !== "active"/);
  assert.match(authorization, /ACCOUNT_SUSPENDED/);
  assert.match(authorization, /AUTHENTICATION_REQUIRED/);
  assert.match(authorization, /PROFILE_UNAVAILABLE/);
});

test("workspace layouts use shared server-side authorization guards", () => {
  assert.match(dashboardLayout, /requireStudentWorkspace/);
  assert.match(professorLayout, /requireProfessorWorkspace/);
});

test("all authenticated product APIs use the shared active-account guard", () => {
  for (const path of protectedApiRoutes) {
    assert.match(readSource(path), /getActiveApiUser/,
      `${path} must use getActiveApiUser`);
  }
});

test("role transitions stay service-role only and protect active resources", () => {
  assert.match(hardeningMigration, /active_student_membership_blocks_professor_role/);
  assert.match(hardeningMigration, /professor_resources_block_student_role/);
  assert.match(
    hardeningMigration,
    /REVOKE ALL ON FUNCTION public\.admin_update_profile_role[\s\S]*?FROM PUBLIC, anon, authenticated;/,
  );
  assert.match(
    hardeningMigration,
    /GRANT EXECUTE ON FUNCTION public\.admin_update_profile_role[\s\S]*?TO service_role;/,
  );
});
