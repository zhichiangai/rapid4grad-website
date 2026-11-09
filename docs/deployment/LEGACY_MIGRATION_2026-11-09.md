# RAPID4GRAD Legacy Migration Checklist (2026-11-09)

## Scope and fixed project identities

| Role | Supabase display name | Immutable project ref | Cloud status at verification |
| --- | --- | --- | --- |
| RAPID Production | `rapid4grad-v2` | `ktfvscyxsdrcrbaemlbl` | ACTIVE_HEALTHY — do not write, pause or recreate |
| RAPID Test / Staging | `rapid4grad-test` | `jpvvcniktyjcdpkfopna` | INACTIVE — target for reviewed legacy data merge |
| Retired RAPID Legacy | `rapid4grad` | `qrfbshncmakvcfjraxiu` | INACTIVE — do not delete yet |
| Unrelated tutoring Production | `tutor-app` | `vctisuglfoxyuwlvyjee` | ACTIVE_HEALTHY — out of scope |

The owner's final requirement is exactly two RAPID Supabase projects (Production and Test) **after** preservation, safe merge and migration QA. Do not use the tutoring database as temporary capacity. Supabase Free has two active project slots currently occupied by both Production services. No billable plan upgrade is authorized.

## Evidence and provenance

The user's 2026-11-09 Codex handoff reported:
- Legacy physical backup `db_cluster-29-07-2026@14-37-54.backup.gz`, 69,228 bytes, SHA-256 `00812700f1da3219bb62c252f4e19a60a6cb31b89338f0f4fc7d097a83f6eead`; gzip integrity and local isolated PostgreSQL restore passed
- Storage backup `qrfbshncmakvcfjraxiu.storage.zip`, 22 bytes, empty, SHA-256 `8739c76e681f900923b900c9df0ef75cf421d39cabb54650c4b9ad19b6a76d85`
- Source inventory: 20 public tables, 2 Auth users, 2 profiles, 2 Storage buckets, 0 Storage objects, 59 public policies; all 20 public tables RLS enabled
- The local restored database was stopped; private backups are not committed

These are **Codex-reported local observations**, not independently inspected files here. File hashes and successful decompression alone do not establish a complete migration. Confirm backup snapshot time and any changes after 2026-07-29. Use local paths/private storage for actual backups, not GitHub.

## Remaining gates before any irreversible deletion

1. **Source completeness**: preserve at least two verified, separately located copies; recheck gzip and SHA-256; confirm the backup date and whether later Legacy Auth/Storage/DB activity is absent or accounted for.
2. **Read-only inventory**: record per-table row counts, column and key metadata, FK relationships, Auth user identities/IDs (redacted in reports), storage objects, RLS, functions, cron, webhooks, OAuth/SMTP and unique historical data.
3. **Test target availability**: safely restore `jpvvcniktyjcdpkfopna` without pausing a Production project or incurring unapproved charges. If unavailable, keep local preparation results but mark cloud merge BLOCKED.
4. **Pre-merge target snapshot**: back up the existing Test project before applying migration. Inspect Test schema/migrations, compare each source table and existing rows; define collision rules and a reversible, idempotent migration. Do not restore a complete Legacy physical backup over the Test database.
5. **Controlled migration**: preserve provenance, do not overwrite existing Test records; map Auth users safely and never copy password hashes/refresh tokens into ordinary app tables; preserve RLS and FK integrity; protect secrets and personal data.
6. **Reconciliation**: verify per-table counts, keys and data checksums where feasible, necessary Auth flows, storage, RLS role isolation, and staging smoke tests. Verify `www.rapid4grad.com` and `tutor.rapid4grad.com` stay unaffected.
7. **Final dependency check**: no Production or external service uses Legacy Ref, unique content is migrated or explicitly archived, and evidence demonstrates restore/rollback. **Only then** use Dashboard to permanently delete the exact Legacy Ref `qrfbshncmakvcfjraxiu` and re-list projects.

Do not infer zero data from a paused project or conclude that the original user's migration requirement was satisfied by making a local copy. If the target remains paused, report `BLOCKED` and do not delete Legacy.

## Deployment protection and branch isolation

Production: `main` → `https://www.rapid4grad.com` → `ktfvscyxsdrcrbaemlbl`, `RAPID_ENV=production`.

Test: `staging` → `https://staging.rapid4grad.com` → `jpvvcniktyjcdpkfopna`, `RAPID_ENV=staging`.

On 2026-11-09, Vercel global Preview and Production `RAPID_ENV` values were created and read back. These environment settings affect subsequent deployments and have not been validated end-to-end at runtime. The retired `v2/lab-pdf-shared-pool` branch historically pointed its Supabase URL at Main. On 2026-11-09 its branch-specific URL and publishable key were renamed to inert `RAPID_RETIRED_*` keys and reset to `disabled`; the two Sensitive overrides (`SUPABASE_SECRET_KEY` and `NEXT_PUBLIC_SITE_URL`) accepted value updates to `disabled` while retaining their keys because Vercel disallows renaming Sensitive variables. Change metadata was verified, but their sensitive values cannot be independently read back. Do not deploy or QA this retired branch. General Preview `RAPID_ENV=staging` should fail closed against Main on new deploys; existing deployments retain prior build settings. Before enabling cloud QA, remove residual inactive overrides via Dashboard if available, validate actual Test URL/key matching, Test availability, and the runtime guard.

## Follow-up status

- **PASS**: Vercel account lists only `rapid4grad-website` and `tutor-app-v2`; `carzyclaws` removed
- **PASS**: Test display name `rapid4grad-test` confirmed, immutable ref unchanged
- **PASS**: Vercel `RAPID_ENV` values persisted for Production and global Preview
- **PARTIAL**: Branch-specific Preview overrides still require clean-up and deployment QA
- **BLOCKED**: Legacy merge, cloud restore, source-to-target comparison and deletion
