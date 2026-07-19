#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
db_container="supabase_db_build"
psql_cmd=(docker exec -i "$db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres)

cd "$repo_root"
supabase db reset --local
"${psql_cmd[@]}" < supabase/tests/v2_professor_subscription_integration.sql

printf 'V2 Professor subscription integration passed.\n'
