# RAPID4GRAD Supabase Environment Architecture

This document is the source of truth for RAPID4GRAD cloud environment ownership. Project names are display labels; project refs determine runtime identity. Do not change a ref, URL, API key, Auth users, Storage, or Production data to rename a project.

## Environment map

| Environment | Branch | URL | Supabase |
| --- | --- | --- | --- |
| Local | working branch | `http://localhost:3000` | local Supabase |
| Staging | `staging` / reviewed feature branches | `https://staging.rapid4grad.com` | `jpvvcniktyjcdpkfopna` (`rapid4grad-preview`) |
| Production | `main` | `https://www.rapid4grad.com` | `ktfvscyxsdrcrbaemlbl` (target display name: `rapid4grad-main`) |

Main owns real Production Auth, Database, Storage, RLS, and product data. Never create disposable QA fixtures there. Preview is an isolated Staging/Preview/QA environment for authenticated browser QA, RLS and migration validation, role and cross-Lab tests, and disposable accounts. Preview is not a newer or older version of RAPID4GRAD: its schema may lead Main during a feature test or lag Main after a release or pause. Before every Preview QA run, check that its schema baseline is compatible with current Production and the migrations under test. Never copy Production learner data into Preview.

The long-term RAPID4GRAD cloud project budget is exactly two: Main and Preview. Do not create a third project for a feature, AI provider, module, migration, or routine QA without explicit owner approval. This limit concerns RAPID4GRAD projects only; unrelated products must not be changed to free quota.

Feature development flows from local/feature branch to isolated Preview/Staging, then QA, RLS and migration checks. Only after PASS does the reviewed release advance to GitHub `main`, Vercel Production, and Supabase Main. Application environment names remain `local`, `staging`, and `production`; project display names do not replace these deployment semantics.

## Current cleanup status (2026-10-23)

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

