#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
db_container="supabase_db_build"
psql_cmd=(docker exec -i "$db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres)

cd "$repo_root"
supabase db reset --local
"${psql_cmd[@]}" < supabase/tests/v2_lab_pdf_shared_pool_integration.sql

result_one="$(mktemp)"
result_two="$(mktemp)"
trap 'rm -f "$result_one" "$result_two"' EXIT

set +e
docker exec "$db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres -Atc \
  "SELECT * FROM public.reserve_lab_pdf_audit_job(
    '11000000-0000-0000-0000-000000000001'::UUID,
    '41000000-0000-0000-0000-000000000001'::UUID,
    'logic_check', 'openai', 'local-model', 'local prompt',
    '82000000-0000-4000-8000-000000000011'::UUID
  );" >"$result_one" 2>&1 &
pid_one=$!
docker exec "$db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres -Atc \
  "SELECT * FROM public.reserve_lab_pdf_audit_job(
    '11000000-0000-0000-0000-000000000002'::UUID,
    '41000000-0000-0000-0000-000000000002'::UUID,
    'logic_check', 'openai', 'local-model', 'local prompt',
    '82000000-0000-4000-8000-000000000012'::UUID
  );" >"$result_two" 2>&1 &
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
  printf 'Expected exactly one final-credit reservation, got %s.\n' "$success_count" >&2
  printf '%s\n' '--- contender one ---' >&2
  cat "$result_one" >&2
  printf '%s\n' '--- contender two ---' >&2
  cat "$result_two" >&2
  exit 1
fi

"${psql_cmd[@]}" <<'SQL'
DO $$
DECLARE
  selected_credit public.lab_usage_credits%ROWTYPE;
  selected_job public.ai_audit_jobs%ROWTYPE;
BEGIN
  SELECT credit.*
  INTO selected_credit
  FROM public.lab_usage_credits AS credit
  WHERE credit.lab_id = (
    SELECT lab.id
    FROM public.labs AS lab
    WHERE lab.owner_professor_id = '21000000-0000-0000-0000-000000000001'::UUID
  )
    AND credit.period_start <= timezone('utc', now())
    AND credit.period_end > timezone('utc', now());

  SELECT job.*
  INTO selected_job
  FROM public.ai_audit_jobs AS job
  WHERE job.idempotency_key IN (
    '82000000-0000-4000-8000-000000000011'::UUID,
    '82000000-0000-4000-8000-000000000012'::UUID
  );

  IF selected_credit.pdf_audit_limit <> 1
     OR selected_credit.pdf_audit_reserved <> 1
     OR selected_credit.pdf_audit_used <> 0
     OR selected_job.id IS NULL THEN
    RAISE EXCEPTION
      'final credit reservation invariant failed: limit=%, reserved=%, used=%, job=%',
      selected_credit.pdf_audit_limit,
      selected_credit.pdf_audit_reserved,
      selected_credit.pdf_audit_used,
      selected_job.id;
  END IF;

  PERFORM public.complete_lab_pdf_audit_job(
    selected_job.id,
    'Concurrency summary',
    '# Concurrency result',
    'low'::public.risk_level,
    ARRAY['concurrency'],
    10,
    5,
    1
  );
  PERFORM public.complete_lab_pdf_audit_job(
    selected_job.id,
    'Concurrency summary',
    '# Concurrency result',
    'low'::public.risk_level,
    ARRAY['concurrency'],
    10,
    5,
    1
  );

  SELECT credit.*
  INTO selected_credit
  FROM public.lab_usage_credits AS credit
  WHERE credit.id = selected_job.credit_id;

  IF selected_credit.pdf_audit_reserved <> 0
     OR selected_credit.pdf_audit_used <> 1
     OR (SELECT count(*) FROM public.ai_audit_results WHERE job_id = selected_job.id) <> 1 THEN
    RAISE EXCEPTION
      'final credit settlement invariant failed: reserved=%, used=%',
      selected_credit.pdf_audit_reserved,
      selected_credit.pdf_audit_used;
  END IF;

  BEGIN
    PERFORM public.reserve_lab_pdf_audit_job(
      '11000000-0000-0000-0000-000000000001'::UUID,
      '41000000-0000-0000-0000-000000000001'::UUID,
      'logic_check', 'openai', 'local-model', 'local prompt',
      '82000000-0000-4000-8000-000000000013'::UUID
    );
    RAISE EXCEPTION 'exhausted pool unexpectedly accepted another job';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%lab_pdf_audit_limit_reached%' THEN RAISE; END IF;
  END;
END;
$$;
SQL

printf 'V2 Lab PDF shared pool integration and final-credit concurrency passed.\n'
