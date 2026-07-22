#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
db_container="supabase_db_build"
psql_cmd=(docker exec -i "$db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres)

cd "$repo_root"
supabase db reset
"${psql_cmd[@]}" < supabase/tests/v2_database_integration.sql
"${psql_cmd[@]}" < supabase/tests/v2_student_course_purchase_integration.sql

result_one="$(mktemp)"
result_two="$(mktemp)"
trap 'rm -f "$result_one" "$result_two"' EXIT

payment_sql="SELECT public.process_one_time_payment_event(
  'manual',
  'concurrent-payment-event',
  'test.checkout.completed',
  'manual_concurrent_order',
  'concurrent-provider-payment',
  'completed',
  2400,
  'TWD',
  timezone('utc', now()),
  '{\"fixture_only\":true}'::JSONB
);"

set +e
docker exec "$db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres -Atc "$payment_sql" >"$result_one" 2>&1 &
pid_one=$!
docker exec "$db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres -Atc "$payment_sql" >"$result_two" 2>&1 &
pid_two=$!
wait "$pid_one"
status_one=$?
wait "$pid_two"
status_two=$?
set -e

if [[ "$status_one" -ne 0 || "$status_two" -ne 0 ]]; then
  printf 'Concurrent payment calls must both return safely.\n' >&2
  cat "$result_one" >&2
  cat "$result_two" >&2
  exit 1
fi

"${psql_cmd[@]}" <<'SQL'
DO $$
DECLARE
  payment_count INTEGER;
  event_count INTEGER;
  entitlement_count INTEGER;
BEGIN
  SELECT count(*) INTO payment_count
  FROM public.payments
  WHERE provider_payment_id = 'concurrent-provider-payment';

  SELECT count(*) INTO event_count
  FROM public.payment_events
  WHERE provider_event_id = 'concurrent-payment-event';

  SELECT count(*) INTO entitlement_count
  FROM public.entitlements
  WHERE user_id = '91000000-0000-0000-0000-000000000005'::UUID
    AND entitlement_type = 'course_full'
    AND status = 'active'
    AND ends_at IS NULL;

  IF payment_count <> 1 OR event_count <> 1 OR entitlement_count <> 1 THEN
    RAISE EXCEPTION
      'concurrent webhook invariant failed: payments=%, events=%, entitlements=%',
      payment_count,
      event_count,
      entitlement_count;
  END IF;
END;
$$;
SQL

printf 'V2 student one-time course purchase integration passed.\n'
