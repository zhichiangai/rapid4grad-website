# Professor Attention Center V1 Implementation Review

## Scope

Professor Attention Center V1 provides a derived, rule-based supervision view at `/professor/attention` and a compact version on `/professor/dashboard`. It does not add a table, migration, cron job, AI provider, notification, or mutation flow.

## Access Boundary

- Professor and assistant users see only active students in Labs they own or actively supervise.
- Student users are redirected by the existing professor workspace guard.
- Cross-Lab data is not joined into the attention model.
- Admin users do not automatically receive all professor attention data; Admin observation remains a separate workspace.
- Suspended accounts remain blocked by the shared active-account guard.
- New supervision reads use the authenticated Supabase client and existing RLS. The server admin client only resolves the existing Lab roster and safe profile display fields.
- Audit information is read through the existing fixed seven-field summary RPC. Raw audit, prompt, PDF, storage path, token and cost data are not loaded.

## Derived Rules

| Signal | Condition | Severity |
|---|---|---|
| 希望近期協助 | Weekly update requests `soon` help | Urgent |
| 目前卡住 | Weekly status is `blocked` | Urgent |
| 兩週以上沒有更新 | Latest weekly update, or membership join date when never submitted, is at least 14 Taipei calendar days old | Urgent |
| 有逾期行動項目 | Open action due date is before today | Urgent |
| 最近研究稽核為高風險 | Shared summary risk is `high` | Urgent |
| 進度稍微落後 | Weekly status is `slightly_behind` | Attention |
| 一週以上沒有更新 | Latest update, or never-submitted membership age, is 7–13 Taipei calendar days old | Attention |
| 近期有行動期限 | Open action is due within 14 days | Attention |
| 近期沒有研究 Meeting | Latest completed meeting is at least 21 days old and no future scheduled meeting exists | Attention |

Never-submitted members receive a seven-day grace period. A future scheduled Meeting suppresses `no_recent_meeting`. Multiple signals are ordered by intervention priority before rendering.

## Data Sources

- `lab_memberships`: active student membership and joined date.
- `profiles`: minimum student display fields through the existing server roster path.
- `weekly_updates`: latest weekly status, blocker, plan and help request through authenticated RLS.
- `meetings`: completed and future scheduled Meeting records through authenticated RLS.
- `meeting_actions`: open overdue and near-deadline action counts through authenticated RLS.
- `get_shared_audit_summaries`: existing consent-scoped summary-only interface.

## UI

- `/professor/dashboard` order is Needs Attention, This Week, Upcoming Meetings, then existing Lab and management controls.
- `/professor/attention` shows the full non-healthy list, weekly status summary and upcoming Meetings.
- Existing Lab creation, subscription, invite and member management controls remain unchanged.
- Cards and links have visible keyboard focus states and semantic headings.
- Attention cards link to the existing student detail route; no new mutation is exposed.
- Professor subscription management is owner-only: assistants and non-owner roles do not receive the billing link, and `/billing` redirects non-owners back to the Professor dashboard.

## Local Validation

- Attention rule contract tests: Passed.
- Existing automated suite: Passed, 99 tests.
- Local Supabase/RLS integration: Existing 18-migration replay and integration suites remained green; this feature adds no migration.
- Local authenticated browser QA: Passed with disposable Local Supabase accounts for Professor A/B, Assistant A, Student, Admin and Suspended Professor. Verified Attention signals, same-Lab visibility, cross-Lab denial, workspace redirects, suspended redirect, assistant read-only boundary and no raw audit fields.
- Responsive QA: Passed at 375px, 768px and 1440px with no horizontal overflow.
- Browser console QA: Passed; no warning or error entries on `/professor/attention`.

## Explicit Non-Goals

No Attention Center notifications, cron jobs, email/LINE alerts, Meeting Center UI, Student 360, thesis progress, AI Professor Assistant, PDF sharing expansion, or database migration are included.

## Release Record

- Review branch: `professor-attention-center-v1`
- Implementation commit: `dd23bb15577ccdc56366459bc96a3e08d3f8440c`
- Local QA correctness fix: `b45b401` limits Professor management controls and billing to owned Labs.
- Preview URL: https://rapid4grad-website-git-professor-1f6411-zhichiang-ai-s-projects.vercel.app
- Deployment ID: `dpl_5FkGKseDWVCtU8ynyFJFinFkf24e` (pre-fix Preview)
- Preview state: new Preview required for `b45b401`
- Runtime errors at release check: none reported in the selected 10-minute window.
