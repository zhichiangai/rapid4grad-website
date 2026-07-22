import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const migration = readFileSync(
  fileURLToPath(
    new URL(
      "../supabase/migrations/20260722190000_restore_email_verification_rpcs.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);
const route = readFileSync(
  fileURLToPath(new URL("../app/api/email/verify/route.ts", import.meta.url)),
  "utf8",
);

test("Email challenge creation is atomic and service-role only", () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.create_email_verification_challenge/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /RETURN 'cooldown'/);
  assert.match(migration, /RETURN 'email_limited'/);
  assert.match(migration, /RETURN 'ip_limited'/);
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.create_email_verification_challenge\([\s\S]*?FROM PUBLIC, anon, authenticated/,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.create_email_verification_challenge\([\s\S]*?TO service_role/,
  );
});

test("Email PIN verification locks rows after five failures", () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.verify_email_challenge/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /challenge\.failed_attempts >= 5/);
  assert.match(migration, /next_failed_attempts := challenge\.failed_attempts \+ 1/);
  assert.match(migration, /RETURN 'locked'/);
  assert.doesNotMatch(migration, /challenge\.attempts|challenge\.max_attempts/);
});

test("Email API uses only the server-side RPC boundary", () => {
  assert.match(route, /createAdminClient\(\)/);
  assert.match(route, /\.rpc\(\s*"create_email_verification_challenge"/);
  assert.match(route, /\.rpc\("verify_email_challenge"/);
  assert.doesNotMatch(route, /NEXT_PUBLIC_RESEND|NEXT_PUBLIC_SUPABASE_SECRET/);
});
