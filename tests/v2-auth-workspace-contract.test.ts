import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  getAvailableWorkspaces,
  getDefaultWorkspacePath,
  isSafeNextPath,
} from "../lib/workspace/access";

function readSource(path: string) {
  return readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
}

const loginPage = readSource("../app/login/page.tsx");
const loginRoute = readSource("../app/auth/login/route.ts");
const callbackRoute = readSource("../app/auth/callback/route.ts");
const emailLoginRoute = readSource("../app/auth/email-login/route.ts");
const signupPage = readSource("../app/signup/page.tsx");
const signupRoute = readSource("../app/auth/signup/route.ts");
const accountSecurityPage = readSource("../app/account/security/page.tsx");
const accountSecurityForm = readSource(
  "../components/account/AccountSecurityForm.tsx",
);
const studentNavigation = readSource(
  "../components/workspace/StudentWorkspaceNavigation.tsx",
);

test("OAuth starts and completes on the current request origin", () => {
  assert.match(loginPage, /new URL\("\/auth\/login", window\.location\.origin\)/);
  assert.match(loginRoute, /new URL\("\/auth\/callback", requestUrl\.origin\)/);
  assert.match(loginRoute, /callbackUrl\.searchParams\.set\("next", nextPath\)/);
  assert.match(callbackRoute, /const origin = requestUrl\.origin/);
  assert.match(callbackRoute, /new URL\(nextPath, request\.url\)/);
  assert.doesNotMatch(loginPage, /NEXT_PUBLIC_SITE_URL/);
  assert.doesNotMatch(loginRoute, /NEXT_PUBLIC_SITE_URL|rapid4grad\.com/);
  assert.doesNotMatch(callbackRoute, /NEXT_PUBLIC_SITE_URL|rapid4grad\.com/);
});

test("safe next accepts only same-site relative paths", () => {
  assert.equal(isSafeNextPath("/dashboard"), true);
  assert.equal(isSafeNextPath("/professor/dashboard"), true);
  assert.equal(isSafeNextPath("https://evil.example/path"), false);
  assert.equal(isSafeNextPath("//evil.example/path"), false);
  assert.equal(isSafeNextPath("dashboard"), false);
  assert.equal(isSafeNextPath(null), false);
});

test("workspace fallback remains role-specific", () => {
  assert.equal(getDefaultWorkspacePath("student"), "/dashboard");
  assert.equal(getDefaultWorkspacePath("professor"), "/professor/dashboard");
  assert.equal(getDefaultWorkspacePath("admin"), "/admin");
  assert.deepEqual(getAvailableWorkspaces("student"), ["student"]);
  assert.deepEqual(getAvailableWorkspaces("professor"), ["professor"]);
  assert.deepEqual(getAvailableWorkspaces("admin"), [
    "student",
    "professor",
    "admin",
  ]);
});

test("email login preserves native Supabase auth and the existing workspace routing", () => {
  assert.match(loginPage, /<form[^>]+onSubmit=\{handleEmailLogin\}/);
  assert.match(loginPage, /name="email"/);
  assert.match(loginPage, /autoComplete="email"/);
  assert.match(loginPage, /name="password"/);
  assert.match(loginPage, /autoComplete="current-password"/);
  assert.match(loginPage, /使用 Google 登入/);
  assert.match(loginPage, /href="\/signup"/);
  assert.match(emailLoginRoute, /auth\.signInWithPassword/);
  assert.match(emailLoginRoute, /getDefaultWorkspacePath\(profile\?\.role\)/);
  assert.match(emailLoginRoute, /isSafeNextPath\(rawNextPath\)/);
  assert.match(emailLoginRoute, /error\?\.code/);
  assert.doesNotMatch(
    emailLoginRoute,
    /console\.(log|warn|error)[\s\S]{0,300}\b(email|password)\s*:/i,
  );
  assert.doesNotMatch(emailLoginRoute, /createAdminClient|SUPABASE_SECRET_KEY/);
});

test("public signup is student-only and keeps Supabase email confirmation behavior", () => {
  assert.match(signupPage, /name="email"/);
  assert.match(signupPage, /name="password"/);
  assert.match(signupPage, /name="confirmPassword"/);
  assert.match(signupPage, /autoComplete="new-password"/);
  assert.match(signupRoute, /auth\.signUp/);
  assert.match(signupRoute, /emailRedirectTo: callbackUrl\.toString\(\)/);
  assert.match(signupRoute, /new URL\("\/auth\/callback", request\.url\)/);
  assert.match(signupRoute, /if \(!data\.session\)/);
  assert.match(signupRoute, /getDefaultWorkspacePath\(profile\?\.role\)/);
  assert.match(signupPage, /原本使用 Google 登入/);
  assert.match(signupPage, /帳號與安全/);
  assert.doesNotMatch(signupPage, /admin|professor/);
  assert.doesNotMatch(
    signupRoute,
    /createAdminClient|SUPABASE_SECRET_KEY|body\.role|options:\s*\{[^}]*role/,
  );
});

test("new-user profile trigger remains student-only without a migration", () => {
  const coreMigration = readSource("../supabase/migrations/002_phase1_core.sql");
  assert.match(coreMigration, /role public\.profile_role NOT NULL DEFAULT 'student'/);
  assert.match(coreMigration, /'student'::public\.profile_role/);
  assert.doesNotMatch(coreMigration, /raw_user_meta_data\s*->>\s*['"]role/);
  assert.doesNotMatch(signupRoute, /CREATE TABLE|ALTER TABLE|DROP TABLE|RLS/);
});

test("authenticated account security uses Supabase password linking without a user id", () => {
  assert.match(accountSecurityPage, /requireActiveUser\("\/account\/security"\)/);
  assert.match(accountSecurityPage, /AccountSecurityForm/);
  assert.match(accountSecurityForm, /auth\.updateUser\(\{ password \}\)/);
  assert.match(accountSecurityForm, /autoComplete="new-password"/);
  assert.match(accountSecurityForm, /role="status"/);
  assert.match(accountSecurityForm, /role="alert"/);
  assert.doesNotMatch(accountSecurityForm, /userId|createAdminClient|SUPABASE_SECRET_KEY/);
  assert.doesNotMatch(accountSecurityForm, /successMessage\s*=\s*[^;]*before|setSuccessMessage\([^)]*error/i);
  assert.match(studentNavigation, /\/account\/security/);
});
