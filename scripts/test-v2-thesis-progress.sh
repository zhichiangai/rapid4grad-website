#!/usr/bin/env bash
set -euo pipefail

psql_cmd=(psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1)
"${psql_cmd[@]}" < supabase/tests/v2_thesis_progress_integration.sql
