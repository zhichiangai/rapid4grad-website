import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isSafeNextPath } from "../lib/workspace/access";

function readSource(path: string) {
  return readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
}

const loginPage = readSource("../app/login/page.tsx");
const callbackRoute = readSource("../app/auth/callback/route.ts");
const forgotPage = readSource("../app/forgot-password/page.tsx");
const resetPage = readSource("../app/reset-password/page.tsx");
const resetForm = readSource("../components/account/ResetPasswordForm.tsx");
const accountSecurityPage = readSource("../app/account/security/page.tsx");
const accountSecurityForm = readSource(
  "../components/account/AccountSecurityForm.tsx",
);
const identityHelper = readSource("../lib/auth/identities.ts");

test("safe redirect rejects browser-normalized external paths", () => {
  assert.equal(isSafeNextPath("/dashboard"), true);
  assert.equal(isSafeNextPath("/account/security"), true);
  assert.equal(isSafeNextPath("https://evil.example"), false);
  assert.equal(isSafeNextPath("//evil.example"), false);
  assert.equal(isSafeNextPath("/\\\\evil.example"), false);
  assert.equal(isSafeNextPath("/dashboard\u0000"), false);
});

test("forgot password uses Supabase recovery without account enumeration", () => {
  assert.match(loginPage, /忘記密碼/);
  assert.match(forgotPage, /resetPasswordForEmail/);
  assert.match(forgotPage, /flow.*recovery/);
  assert.match(forgotPage, /如果這個 Email 已註冊/);
  assert.doesNotMatch(forgotPage, /這個 Email 沒有帳號|Google 帳號/);
  assert.doesNotMatch(forgotPage, /console\.(log|warn|error)[\s\S]{0,300}\b(email|password)\s*:/i);
});

test("recovery callback and reset page keep tokens out of the UI", () => {
  assert.match(callbackRoute, /flow === "recovery"/);
  assert.match(callbackRoute, /\/reset-password/);
  assert.match(resetPage, /robots: \{ index: false, follow: false \}/);
  assert.match(resetForm, /auth\.getUser\(\)/);
  assert.match(resetForm, /auth\.updateUser\(\{ password \}\)/);
  assert.match(resetForm, /\/login\?password_reset=success/);
  assert.match(resetForm, /重新寄送密碼重設信/);
  assert.doesNotMatch(resetForm, /console\.(log|warn|error)[\s\S]{0,300}\b(password|token|session)\s*:/i);
});

test("Google identity status uses Auth identities, not profile flags", () => {
  assert.match(identityHelper, /provider === "google"/);
  assert.match(identityHelper, /identity_data\?\.email/);
  assert.match(accountSecurityPage, /requireActiveUser\("\/account\/security"\)/);
  assert.match(accountSecurityForm, /auth\.getUserIdentities\(\)/);
  assert.match(accountSecurityForm, /auth\.linkIdentity\(/);
  assert.match(accountSecurityForm, /provider: "google"/);
  assert.match(accountSecurityForm, /auth\.unlinkIdentity\(googleIdentity\)/);
  assert.match(accountSecurityForm, /auth\.signInWithPassword\(/);
  assert.match(accountSecurityForm, /originalUserId/);
  assert.match(accountSecurityForm, /PENDING_LINK_USER_ID/);
  assert.doesNotMatch(accountSecurityForm, /createAdminClient|SUPABASE_SECRET_KEY|profiles\.google/);
});

test("Google unlink requires a verified email fallback and clears password state", () => {
  assert.match(accountSecurityForm, /hasEmailIdentity/);
  assert.match(accountSecurityForm, /目前沒有其他可用登入方式/);
  assert.match(accountSecurityForm, /autoComplete="current-password"/);
  assert.match(accountSecurityForm, /setUnlinkPassword\(""\)/);
  assert.match(accountSecurityForm, /reauthData\.user\?\.id !== originalUserId/);
  assert.doesNotMatch(accountSecurityForm, /localStorage[\s\S]{0,120}password|sessionStorage[\s\S]{0,120}password/i);
  assert.doesNotMatch(accountSecurityForm, /console\.(log|warn|error)[\s\S]{0,300}\b(password|token|session|access_token|refresh_token)\s*:/i);
});

test("Account Security has no database or role mutation path", () => {
  assert.doesNotMatch(accountSecurityPage, /ALTER TABLE|CREATE TABLE|DROP TABLE|RLS|role\s*=/i);
  assert.doesNotMatch(accountSecurityForm, /update\(\{[^}]*role|from\(["']profiles["']\)/);
});
