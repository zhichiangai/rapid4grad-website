# RAPID4GRAD Graduation Risk Checker V1 Implementation Review

## Release Boundary

- Feature branch: `graduation-risk-checker-v1`
- Base main: `de0faa26942b2ebd4a29d8ebed0a18d3dc8bd449`
- Production: **NOT RELEASED**
- Main: **NOT MERGED**
- New table or migration: **NONE**
- Professor Attention semantics: **UNCHANGED**

## Product Scope

Graduation Risk Checker is a deterministic student navigation layer. It translates the student's existing Weekly, completed Meeting, student-owned Meeting Action and private thesis milestone data into a status, reason and next action. It does not predict graduation probability, determine official eligibility, calculate a score, use AI or expose a Professor/Admin risk view.

The route is `/dashboard/graduation-risk`, with the student navigation label `畢業風險`. The Dashboard integration is a compact link card; the full risk overview remains on the dedicated student route.

## Data And Privacy

The server loader uses `requireStudentWorkspace` and the authenticated Supabase client only. It queries the current student's active Lab membership, latest Weekly timestamp, own Meetings, own Meeting Actions and own thesis milestone fields. Student Actions count only when `owner_type=student`, `owner_user_id=student_user_id`; supervisor-owned Actions are excluded. Thesis rows remain private under the existing Thesis RLS. No service-role client, raw private PDF, AI audit, prompt, note, token or cost data is read.

## Deterministic Rules

Signals are evaluated in the frozen order: thesis blocked, overdue student Action, Weekly overdue, thesis target overdue, stale Weekly, Action deadline soon, thesis target soon, and no recent Meeting. Dates use `Asia/Taipei`; no numeric score or probability is produced. Overall status is `urgent`, `attention`, `stable`, or `setup_needed` according to the approved rules. Primary recommendations point only to Thesis, Actions, Weekly or Meetings.

## UI And Accessibility

The first screen shows current status, primary reason, recommendation and CTA. Supporting signals are capped at three. Setup and stable states have their approved copy and CTAs. Links use visible focus rings and the layout stacks on narrow screens without a wide table or focus trap.

## Validation

- Domain and server contract tests: Passed, including the 7/14-day never-submitted Weekly boundaries and current-Lab query guards.
- Full automated suite: Passed, `123/123`.
- Lint: Passed.
- TypeScript: Passed.
- Build: Passed.
- `git diff --check`: Passed.
- Migration diff against base: Empty; no migration was added.
- Authenticated QA environment: Local Next.js with isolated `rapid4grad-preview` Supabase (`jpvvcniktyjcdpkfopna`), using real `signInWithPassword`, JWT and RLS. Production was not used.
- Authenticated browser QA: Passed for Student A current-Lab isolation and urgent signals, Student B cross-student isolation, Setup state, Professor redirect, Dashboard integration, 375/768/1440 layouts, keyboard focus, HTTP 200 responses and clean console/page errors.
- QA cleanup: Passed. All marked `RISK_QA_` database rows and disposable Auth users were removed; no QA rows remained.
- Preview: READY, deployment `dpl_3rbZA4LJE8k1zhpmotQZUMFn4dRR`, URL `https://rapid4grad-website-opbnrm6b0-zhichiang-ai-s-projects.vercel.app`, branch `graduation-risk-checker-v1`, commit `5b5f5f62fbb23ce0f5bd324a52932a214065350e`. Vercel runtime errors: none observed.

## Final Correction

- External Review correction: never-submitted Weekly is now `no_recent_update` / attention from 7 through 13 membership days, and `update_overdue` / urgent from 14 membership days onward. The 0 through 6 day window emits no Weekly signal.
- Weekly, Meeting and Meeting Action risk reads are explicitly filtered to the current active Lab. Thesis milestone reads remain student-private and student-level without a Lab filter.
- Regression coverage: 123 tests pass, including the 7/14-day boundary cases and source-level current-Lab query guards.
- Authenticated QA: **PASS** on isolated Preview Supabase with real Auth/JWT/RLS. Old Lab Weekly, Meeting and Action data did not contaminate the current-Lab result; cross-student, urgent, setup and Professor boundary checks passed.
- QA-only fixture and harness: removed after verification. Production ref `ktfvscyxsdrcrbaemlbl` was not mutated.

## Compatibility Correction

- During authenticated Dashboard QA, the existing `advisor_memories` client query used fields that do not exist in the V2 schema and returned HTTP 400. The minimum fix maps the existing UI to `preference_style`, `common_questions` and `custom_notes` in `app/dashboard/page.tsx`. No schema, migration or authorization change was made.

## Explicit Exclusions

No Professor risk route, Admin risk access, AI inference, numeric probability, persistence/history table, cron, notifications, Calendar, Email, LINE, Student 360 or Thesis RLS change is included. Production remains unchanged until a separate release decision.
