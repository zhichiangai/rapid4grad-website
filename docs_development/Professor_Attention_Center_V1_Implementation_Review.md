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

## Local Validation

- Attention rule contract tests: Passed.
- Existing automated suite: Passed during implementation; rerun all quality gates before commit.
- Local Supabase/RLS integration: must be rerun if the local environment is available. This feature adds no migration, so the existing schema replay remains the source of truth.
- Browser visual QA at 375px, 768px and 1440px: Preview-only gate; not claimed until a Preview session is available.

## Explicit Non-Goals

No Attention Center notifications, cron jobs, email/LINE alerts, Meeting Center UI, Student 360, thesis progress, AI Professor Assistant, PDF sharing expansion, or database migration are included.

## Release Record

- Review branch: `professor-attention-center-v1`
- Implementation commit: pending local validation and commit
- Preview URL: pending branch Preview deployment
- Deployment ID: pending branch Preview deployment
- Preview state: pending
