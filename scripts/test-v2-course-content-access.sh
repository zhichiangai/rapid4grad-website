#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
db_container="supabase_db_build"
psql_cmd=(docker exec -i "$db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres)

cd "$repo_root"
supabase db reset
"${psql_cmd[@]}" < supabase/tests/v2_course_content_access_integration.sql

printf 'V2 course content access integration passed.\n'
