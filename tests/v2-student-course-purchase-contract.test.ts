import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const migration = readFileSync(
  fileURLToPath(
    new URL(
      "../supabase/migrations/20260718222430_student_one_time_course_purchase.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);

test("checkout pricing and open-order idempotency are decided transactionally", () => {
  assert.match(migration, /create_student_course_checkout_order/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /student-lab-course-upgrade/);
  assert.match(migration, /membership\.role = 'student'/);
  assert.match(migration, /subscription\.status IN/);
  assert.match(migration, /course_already_owned/);
});

test("verified payment processing is idempotent and grants a permanent entitlement", () => {
  assert.match(migration, /process_one_time_payment_event/);
  assert.match(migration, /provider_event_id = target_event_id/);
  assert.match(migration, /status = 'processed'/);
  assert.match(migration, /grant_course_entitlement_for_order/);
  assert.match(migration, /target_outcome = 'refunded'/);
  assert.match(migration, /never revokes a permanent entitlement automatically/);
});

test("payment mutation functions are service-role only", () => {
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.create_student_course_checkout_order[\s\S]*?FROM PUBLIC, anon, authenticated/,
  );
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.process_one_time_payment_event[\s\S]*?FROM PUBLIC, anon, authenticated/,
  );
  assert.doesNotMatch(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.(?:create_student_course_checkout_order|process_one_time_payment_event)[\s\S]*?TO authenticated/,
  );
});
