#!/usr/bin/env bash
set -euo pipefail

db_container="supabase_db_build"
psql_cmd=(docker exec -i "$db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres)

supabase db reset --local
"${psql_cmd[@]}" < supabase/tests/v2_email_verification_integration.sql

result_one="$(mktemp)"
result_two="$(mktemp)"
trap 'rm -f "$result_one" "$result_two"' EXIT

challenge_sql_one="SET ROLE service_role; SELECT public.create_email_verification_challenge('e4000000-0000-0000-0000-000000000001', 'concurrent-email', 'pin-one', 'concurrent-ip', timezone('utc', now()) + interval '10 minutes');"
challenge_sql_two="SET ROLE service_role; SELECT public.create_email_verification_challenge('e4000000-0000-0000-0000-000000000002', 'concurrent-email', 'pin-two', 'concurrent-ip', timezone('utc', now()) + interval '10 minutes');"

docker exec "$db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres -Atc "$challenge_sql_one" >"$result_one" 2>&1 &
pid_one=$!
docker exec "$db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres -Atc "$challenge_sql_two" >"$result_two" 2>&1 &
pid_two=$!

wait "$pid_one"
wait "$pid_two"

created_count=$(grep -hxc 'created' "$result_one" "$result_two" | awk '{ total += $1 } END { print total + 0 }')
cooldown_count=$(grep -hxc 'cooldown' "$result_one" "$result_two" | awk '{ total += $1 } END { print total + 0 }')
row_count=$(docker exec "$db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres -Atc \
  "SELECT count(*) FROM public.email_verification_challenges WHERE email_hash = 'concurrent-email' AND ip_hash = 'concurrent-ip';")

if [[ "$created_count" != "1" || "$cooldown_count" != "1" || "$row_count" != "1" ]]; then
  printf 'Email challenge concurrency invariant failed: created=%s cooldown=%s rows=%s\n' \
    "$created_count" "$cooldown_count" "$row_count" >&2
  exit 1
fi

printf 'V2 Email verification migration replay and concurrency passed.\n'
