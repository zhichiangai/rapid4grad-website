# RAPID4GRAD Supabase Environment Architecture

This document is the source of truth for RAPID4GRAD cloud environment ownership. Project names are display labels; project refs determine runtime identity. Do not change a ref, URL, API key, Auth users, Storage, or Production data to rename a project.

## Environment map

| Environment | Branch | URL | Supabase |
| --- | --- | --- | --- |
| Local | working branch | `http://localhost:3000` | local Supabase |
| Staging | `staging` / reviewed feature branches | `https://staging.rapid4grad.com` | `jpvvcniktyjcdpkfopna` (`rapid4grad-test`) |
| Production | `main` | `https://www.rapid4grad.com` | `ktfvscyxsdrcrbaemlbl` (`rapid4grad-v2`) |

Main owns real Production Auth, Database, Storage, RLS, and product data. Never create disposable QA fixtures there. Preview is an isolated Staging/Preview/QA environment for authenticated browser QA, RLS and migration validation, role and cross-Lab tests, and disposable accounts. Preview is not a newer or older version of RAPID4GRAD: its schema may lead Main during a feature test or lag Main after a release or pause. Before every Preview QA run, check that its schema baseline is compatible with current Production and the migrations under test. Never copy Production learner data into Preview.

The long-term RAPID4GRAD cloud project budget is exactly two: Production Main (`rapid4grad-v2`) and Test/Staging (`rapid4grad-test`). Do not create a third project for a feature, AI provider, module, migration, or routine QA without explicit owner approval. This limit concerns RAPID4GRAD projects only; unrelated products must not be changed to free quota.

Feature development flows from local/feature branch to isolated Preview/Staging, then QA, RLS and migration checks. Only after PASS does the reviewed release advance to GitHub `main`, Vercel Production, and Supabase Main. Application environment names remain `local`, `staging`, and `production`; project display names do not replace these deployment semantics.

## Verified cloud state (2026-11-09)

The active RAPID4GRAD Production project is `rapid4grad-v2` (`ktfvscyxsdrcrbaemlbl`). **Keep this display name**: the previously proposed `rapid4grad-main` rename was superseded by the owner's explicit decision. Production is `ACTIVE_HEALTHY`. The RAPID4GRAD Test/Staging project has actually been renamed to **`rapid4grad-test`** (unchanged ref `jpvvcniktyjcdpkfopna`), but is **INACTIVE**. A display-name rename is not a restore or a migration. `tutor-app` (`vctisuglfoxyuwlvyjee`) is an unrelated healthy Production service and must not be paused, deleted, or used as a temporary quota release.

The retired Legacy `rapid4grad` (`qrfbshncmakvcfjraxiu`) is still **INACTIVE and NOT deleted**. According to the user's Codex handoff, a dated physical database backup passed gzip verification and restored in an isolated local PostgreSQL environment. Codex reported 20 public tables, 2 Auth users, 2 profiles, 2 Storage buckets, no Storage objects, and 59 public RLS policies. The backup appears dated 2026-07-29; its snapshot time and any later unique data must be verified. Those counts and local backup verification have **not** been independently audited in this connected cloud session. Table-by-table row counts, Auth mapping, unique historical data, external dependencies, and source-to-target reconciliation are still outstanding. **LEGACY PROJECT DELETION BLOCKED** until the original requirement to preserve/merge data into the Test project and to validate the migration is met.

The Supabase organization is on **Free** with two active project slots presently occupied by `rapid4grad-v2` and the unrelated `tutor-app`. A Legacy restore failed with the active-free-project quota error. Do not pause either Production service, buy a plan, create another RAPID cloud project, or treat the INACTIVE `rapid4grad-test` as an online QA target without explicit approval. Keep verified private backups offline and prepare an isolated local source-to-target migration plan. Upgrade/additional capacity is an explicit owner decision, not an implicit authorization.

Vercel's RAPID project remains `rapid4grad-website`; `tutor-app-v2` is the unrelated second retained Vercel project. The unused `carzyclaws` Vercel project was deleted and an independent project-list check found only the two retained projects. The `carzyclaws.rapid4grad.com` project domain association is gone; the website code repository is not part of the Vercel deletion.

**Vercel guard configuration was updated on 2026-11-09**: project-level `RAPID_ENV=production` now exists for Production; project-level `RAPID_ENV=staging` now exists for all Preview deployments; the `staging` branch override already had `RAPID_ENV=staging` and the Test project URL. This closes the *missing variable configuration* finding for **future deployments** but does not retroactively update or validate previously deployed builds. The historical `v2/lab-pdf-shared-pool` Preview branch still has a branch-specific `NEXT_PUBLIC_SUPABASE_URL` override pointing at Main. Its credential pair was not fully verified or cleaned up. **Do not use that branch for QA or data writes**. On a new deployment, the Preview-level `RAPID_ENV=staging` is intended to fail closed against a Main URL, but validate the runtime contract (middleware/server clients), effective env variables, and staging branch deployment before claiming end-to-end isolation.

See `docs/deployment/LEGACY_MIGRATION_2026-11-09.md` for the migration acceptance gates and remaining prerequisites. Do not merge historical data directly into Production, and never upload backup files or secrets to GitHub.

## Historical cleanup status (2026-10-23; superseded below)

The Main ref is `ktfvscyxsdrcrbaemlbl`, but its dashboard display name was still `rapid4grad-v2` at the last read. Renaming it to `rapid4grad-main` remains pending; do not treat this document's target label as proof that a rename occurred. Preview ref `jpvvcniktyjcdpkfopna` retains the name `rapid4grad-preview` but is paused. A restore attempt was refused because the Supabase Free-plan active-project quota is full. Do not pause or delete an unrelated product to free capacity.

The retired legacy ref `qrfbshncmakvcfjraxiu` is not an approved runtime environment. It is still present and paused, **not deleted**. Its Auth, Database, Storage, Edge Functions, OAuth/SMTP, webhooks, cron, Realtime, Vault, and unique-data audit could not be completed while inaccessible. `LEGACY PROJECT DELETION BLOCKED` until that audit proves no remaining official dependency or unique Production data. Preserve the runtime rejection of this ref and historical release records. Never infer that a paused project is empty.

Vercel environment review also found no explicit Production `RAPID_ENV` variable, while the current guard treats an unset value as `local`. A historical Preview branch override (`v2/lab-pdf-shared-pool`) points its Supabase URL to Main. These are unresolved safety findings, not approval to modify Production variables or release code without confirming the effective URL/key pair and impact. Recheck all branch overrides before Preview QA.

Random Vercel deployment URLs are diagnostic surfaces only, not the canonical human QA URL.

## Required environment values

Set `RAPID_ENV=local|staging|production`. When explicitly set to `staging` or `production`, the runtime guard rejects a Supabase URL with the wrong approved ref. The legacy ref `qrfbshncmakvcfjraxiu` is always rejected. An unset `RAPID_ENV` currently falls back to `local`, so deployment configuration must be audited before claiming the cloud guard is enforced.

Never commit `.env*.local`, tokens, passwords, or Supabase secrets.

## Workflow

1. Implement and test locally.
2. Run `npm test`, `npm run lint`, `npx tsc --noEmit --incremental false`, `npm run build`, and `git diff --check`.
3. Push the reviewed candidate to `staging`.
4. Use `https://staging.rapid4grad.com` for cloud QA.
5. Use one human Staging QA only for risky changes such as migrations, RLS, auth, player, or lifecycle behavior.
6. After Staging QA passes, perform the reviewed expand-before-deploy migration and release to `main`.

## QA commands

- `npm run env:check`: prints only environment, project ref, SHA, and deployment target.
- `npm run qa:seed:staging`: idempotently prepares the marked staging course fixture; it refuses any non-staging project.
- `npm run qa:course`: local Playwright smoke tests.
- `npm run qa:course:staging`: fixed-domain staging smoke tests.
- `npm run qa:course:headed`: visible browser run; use a real authenticated Playwright storage state when testing Admin or Student flows.

Playwright never automates Google password or consent screens. Store any real authenticated state only under `.playwright/.auth/`, which is ignored by Git.

## Safety

Staging may contain only clearly marked QA users, courses, questions, and analytics. Do not copy Production learner data. Mux Data remains disabled; internal session/watch-segment analytics remain primary. Do not disable Vercel Deployment Protection just to make QA easier.

