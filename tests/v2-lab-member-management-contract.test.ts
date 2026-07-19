import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = read(
  "../supabase/migrations/20260719144418_lab_member_management.sql",
);
const inviteRoute = read("../app/api/labs/invite/route.ts");
const joinRoute = read("../app/api/labs/join/route.ts");
const membersRoute = read("../app/api/labs/members/route.ts");
const memberUi = read("../components/professor/LabMemberManagement.tsx");
const labPage = read("../app/professor/labs/[labId]/page.tsx");

test("member removal, consent revocation, and action logging share one transaction", () => {
  const removalFunction = migration.match(
    /CREATE OR REPLACE FUNCTION public\.remove_lab_member[\s\S]*?\n\$\$;/,
  )?.[0];
  assert.ok(removalFunction);
  assert.match(removalFunction, /FROM public\.labs[\s\S]*?FOR UPDATE/);
  assert.match(removalFunction, /FROM public\.lab_memberships[\s\S]*?FOR UPDATE/);
  assert.match(removalFunction, /lab_owner_cannot_be_removed/);
  assert.match(removalFunction, /app_private\.has_active_lab_subscription/);
  assert.match(removalFunction, /status = 'removed'/);
  assert.match(removalFunction, /UPDATE public\.audit_summary_shares/);
  assert.match(removalFunction, /INSERT INTO public\.lab_membership_action_logs/);
});

test("Lab action logs are service-only and contain safe membership snapshots", () => {
  assert.match(migration, /CREATE TABLE public\.lab_membership_action_logs/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(
    migration,
    /REVOKE ALL ON TABLE public\.lab_membership_action_logs[\s\S]*?FROM PUBLIC, anon, authenticated/,
  );
  assert.match(
    migration,
    /GRANT SELECT, INSERT ON TABLE public\.lab_membership_action_logs[\s\S]*?TO service_role/,
  );
  assert.doesNotMatch(
    migration,
    /GRANT[^;]*(?:UPDATE|DELETE)[^;]*public\.lab_membership_action_logs/,
  );
  assert.doesNotMatch(migration, /GRANT (?:SELECT|INSERT|UPDATE|DELETE)[^;]*TO authenticated/);
  assert.doesNotMatch(migration, /storage_path|original_filename|result_markdown|token_input|amount|course_progress/);
});

test("staff role changes are owner-only, logged, and cannot convert students", () => {
  const roleFunction = migration.match(
    /CREATE OR REPLACE FUNCTION public\.change_lab_member_role[\s\S]*?\n\$\$;/,
  )?.[0];
  assert.ok(roleFunction);
  assert.match(roleFunction, /selected_lab\.owner_professor_id <> target_actor_id/);
  assert.match(roleFunction, /lab_owner_role_cannot_change/);
  assert.match(roleFunction, /student_membership_role_is_fixed/);
  assert.match(roleFunction, /INSERT INTO public\.lab_membership_action_logs/);
});

test("invite and join routes use the V2 service-only RPC boundary", () => {
  assert.match(inviteRoute, /\.rpc\(\s*"create_lab_invite"/);
  assert.match(inviteRoute, /\.rpc\(\s*"revoke_lab_invite"/);
  assert.doesNotMatch(inviteRoute, /\.from\("lab_invite_codes"\)[\s\S]{0,120}\.insert\(/);
  assert.doesNotMatch(inviteRoute, /\.from\("lab_invite_codes"\)[\s\S]{0,120}\.update\(/);
  assert.match(joinRoute, /\.rpc\("redeem_lab_invite"/);
  assert.doesNotMatch(joinRoute, /join_lab_with_invite/);
});

test("member API never updates membership or consent tables directly", () => {
  assert.match(membersRoute, /profile\?\.role !== "professor"/);
  assert.match(membersRoute, /\.rpc\("remove_lab_member"/);
  assert.match(membersRoute, /\.rpc\("change_lab_member_role"/);
  assert.doesNotMatch(membersRoute, /\.from\("lab_memberships"\)[\s\S]{0,150}\.update\(/);
  assert.doesNotMatch(membersRoute, /\.from\("audit_summary_shares"\)/);
  assert.doesNotMatch(membersRoute, /error\.message[^)]*\}\s*,\s*\{\s*status/);
});

test("Professor member UI exposes seats, roles, status, and confirmed removal only", () => {
  assert.match(memberUi, /Student seats/);
  assert.match(memberUi, /Assistants/);
  assert.match(memberUi, /再次確認並移除/);
  assert.match(memberUi, /移除原因（必填）/);
  assert.match(memberUi, /action: "remove"/);
  assert.match(memberUi, /action: "change_role"/);
  assert.match(labPage, /LabMemberManagement/);
  assert.doesNotMatch(memberUi, /student_documents|storage_path|payments|course_progress/);
  assert.doesNotMatch(labPage, /result_markdown|input_prompt|storage_path|course_progress/);
});
