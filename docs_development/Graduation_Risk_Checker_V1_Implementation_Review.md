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

- Domain and server contract tests: Passed, 6 new tests.
- Full automated suite: Passed, `122/122`.
- Lint: Passed.
- TypeScript: Passed after sequential Next build/type validation.
- Build: Passed.
- `git diff --check`: Passed.
- Migration diff against base: Empty; no migration was added.
- Local Supabase replay and authenticated browser QA: **BLOCKED BY LOCAL ENVIRONMENT** because Docker daemon was unavailable. No Production account or database was used as a substitute.
- Preview: READY, deployment `dpl_HeAprmRPXV1yQRgszV7Ugw9HCcnx`, URL `https://rapid4grad-website-y6wbymwkh-zhichiang-ai-s-projects.vercel.app`, branch `graduation-risk-checker-v1`, commit `bcf658938f1e6d6e8fc851180d12bd0b2072d4e0`. The deployment is protected by Vercel Authentication; no authenticated application mutation was performed.

## Explicit Exclusions

No Professor risk route, Admin risk access, AI inference, numeric probability, persistence/history table, cron, notifications, Calendar, Email, LINE, Student 360 or Thesis RLS change is included. Production remains unchanged until a separate release decision.
