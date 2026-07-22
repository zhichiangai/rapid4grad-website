#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
db_container="supabase_db_build"
psql_cmd=(docker exec -i "$db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres)

cd "$repo_root"
supabase db reset
"${psql_cmd[@]}" < supabase/tests/v2_database_integration.sql

result_one="$(mktemp)"
result_two="$(mktemp)"
trap 'rm -f "$result_one" "$result_two"' EXIT

# Two different Labs race to activate the same student. The partial unique index
# must allow exactly one active student membership across the entire system.
set +e
docker exec "$db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres -Atc \
  "SELECT public.redeem_lab_invite('v2-one-active-lab-race-one', '10000000-0000-0000-0000-000000000002'::UUID);" \
  >"$result_one" 2>&1 &
membership_pid_one=$!
docker exec "$db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres -Atc \
  "SELECT public.redeem_lab_invite('v2-one-active-lab-race-two', '10000000-0000-0000-0000-000000000002'::UUID);" \
  >"$result_two" 2>&1 &
membership_pid_two=$!
wait "$membership_pid_one"
membership_status_one=$?
wait "$membership_pid_two"
membership_status_two=$?
set -e

membership_success_count=0
[[ "$membership_status_one" -eq 0 ]] && membership_success_count=$((membership_success_count + 1))
[[ "$membership_status_two" -eq 0 ]] && membership_success_count=$((membership_success_count + 1))

if [[ "$membership_success_count" -ne 1 ]]; then
  printf 'Expected one active-membership success, got %s.\n' "$membership_success_count" >&2
  printf '%s\n' '--- Lab one membership race ---' >&2
  cat "$result_one" >&2
  printf '%s\n' '--- Lab two membership race ---' >&2
  cat "$result_two" >&2
  exit 1
fi

"${psql_cmd[@]}" <<'SQL'
DO $$
DECLARE
  active_memberships INTEGER;
  invite_uses INTEGER;
BEGIN
  SELECT count(*) INTO active_memberships
  FROM public.lab_memberships
  WHERE user_id = '10000000-0000-0000-0000-000000000002'::UUID
    AND role = 'student'::public.lab_role
    AND status = 'active'::public.lab_membership_status;

  SELECT sum(used_count) INTO invite_uses
  FROM public.lab_invite_codes
  WHERE code_hash IN (
    'v2-one-active-lab-race-one',
    'v2-one-active-lab-race-two'
  );

  IF active_memberships <> 1 OR invite_uses <> 1 THEN
    RAISE EXCEPTION
      'active membership invariant failed: memberships=%, uses=%',
      active_memberships,
      invite_uses;
  END IF;

  UPDATE public.lab_memberships
  SET
    status = 'removed'::public.lab_membership_status,
    removed_at = timezone('utc', now()),
    removed_by = NULL,
    removal_reason = 'Local concurrency cleanup'
  WHERE user_id = '10000000-0000-0000-0000-000000000002'::UUID
    AND status = 'active'::public.lab_membership_status;
END;
$$;
SQL

: >"$result_one"
: >"$result_two"

set +e
docker exec "$db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres -Atc \
  "SELECT public.redeem_lab_invite('v2-final-seat-invite-hash', '10000000-0000-0000-0000-000000000015'::UUID);" \
  >"$result_one" 2>&1 &
pid_one=$!
docker exec "$db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres -Atc \
  "SELECT public.redeem_lab_invite('v2-final-seat-invite-hash', '10000000-0000-0000-0000-000000000016'::UUID);" \
  >"$result_two" 2>&1 &
pid_two=$!
wait "$pid_one"
status_one=$?
wait "$pid_two"
status_two=$?
set -e

success_count=0
[[ "$status_one" -eq 0 ]] && success_count=$((success_count + 1))
[[ "$status_two" -eq 0 ]] && success_count=$((success_count + 1))

if [[ "$success_count" -ne 1 ]]; then
  printf 'Expected one final-seat success, got %s.\n' "$success_count" >&2
  printf '%s\n' '--- contender one ---' >&2
  cat "$result_one" >&2
  printf '%s\n' '--- contender two ---' >&2
  cat "$result_two" >&2
  exit 1
fi

"${psql_cmd[@]}" <<'SQL'
DO $$
DECLARE
  target_lab UUID;
  active_students INTEGER;
  joined_contenders INTEGER;
  invite_uses INTEGER;
BEGIN
  SELECT id INTO target_lab
  FROM public.labs
  WHERE owner_professor_id = '20000000-0000-0000-0000-000000000001'::UUID;

  SELECT count(*) INTO active_students
  FROM public.lab_memberships
  WHERE lab_id = target_lab
    AND role = 'student'::public.lab_role
    AND status = 'active'::public.lab_membership_status;

  SELECT count(*) INTO joined_contenders
  FROM public.lab_memberships
  WHERE lab_id = target_lab
    AND user_id IN (
      '10000000-0000-0000-0000-000000000015'::UUID,
      '10000000-0000-0000-0000-000000000016'::UUID
    )
    AND status = 'active'::public.lab_membership_status;

  SELECT used_count INTO invite_uses
  FROM public.lab_invite_codes
  WHERE code_hash = 'v2-final-seat-invite-hash';

  IF active_students <> 15 OR joined_contenders <> 1 OR invite_uses <> 1 THEN
    RAISE EXCEPTION
      'final seat invariant failed: active=%, contenders=%, uses=%',
      active_students,
      joined_contenders,
      invite_uses;
  END IF;
END;
$$;
SQL

printf 'V2 Local Supabase integration passed, including active-Lab and final-seat concurrency.\n'
