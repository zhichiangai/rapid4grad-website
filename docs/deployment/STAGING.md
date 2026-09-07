# RAPID4GRAD Stable Staging

## Environment map

| Environment | Branch | URL | Supabase |
| --- | --- | --- | --- |
| Local | working branch | `http://localhost:3000` | local Supabase |
| Staging | `staging` | `https://staging.rapid4grad.com` | `jpvvcniktyjcdpkfopna` (`rapid4grad-preview`) |
| Production | `main` | `https://www.rapid4grad.com` | `ktfvscyxsdrcrbaemlbl` (`rapid4grad-v2`) |

Random Vercel deployment URLs are diagnostic surfaces only, not the canonical human QA URL.

## Required environment values

Set `RAPID_ENV=local|staging|production`. Staging and Production fail fast if the Supabase URL does not match their approved project ref. The inactive legacy project `qrfbshncmakvcfjraxiu` is always rejected.

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

