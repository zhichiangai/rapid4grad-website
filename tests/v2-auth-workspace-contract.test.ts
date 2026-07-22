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

test("OAuth starts and completes on the current request origin", () => {
  assert.match(loginPage, /new URL\("\/auth\/login", window\.location\.origin\)/);
  assert.match(loginRoute, /new URL\("\/auth\/callback", requestUrl\.origin\)/);
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
