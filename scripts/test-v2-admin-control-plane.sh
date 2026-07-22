#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
db_container="supabase_db_build"

cd "$repo_root"
supabase db reset --local
docker exec -i "$db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres \
  < supabase/tests/v2_admin_control_plane_integration.sql

printf 'V2 Admin control plane migration replay and integration passed.\n'
