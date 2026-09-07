# Course Intelligence V3 Implementation Review

## Scope

V3 extends the existing Course Operations V2.1 workflow without replacing the Admin Course Studio or the learner Learning Center. The implementation is additive and keeps existing `course_progress`, access tiers, OAuth, Mux direct upload, signed playback, and Admin authorization boundaries intact.

## Lifecycle

`course_lessons.publication_state` is the human-readable lifecycle source of truth: `draft`, `live`, `paused`, or `archived`. A database trigger keeps the legacy `is_published` field compatible with existing learner queries. Pausing hides a lesson from learners without deleting the lesson, video, questions, sessions, or watch segments. Archiving is reversible to a paused state. Publishing remains blocked until a Mux lesson has a ready Playback ID.

## Intelligence data model

- `course_video_versions` records every upload as a version. A ready replacement retires the prior ready version but does not delete its asset or history.
- `course_view_sessions` stores identified learner sessions and low-frequency progress evidence.
- `course_watch_segments` stores contiguous segments and explicit skip/replay transitions.
- `course_questions` stores timestamped learner questions and unclear signals, with Admin answer/resolution state.

The server derives `user_id` from the authenticated session. The browser cannot submit an arbitrary learner identity. Admin Preview deliberately does not write sessions, segments, questions, or progress.

## Admin surfaces

The Course Studio now exposes:

- Course Library with lifecycle, audience, and video readiness.
- Attention Center driven by replay, drop-off, and question evidence rather than an opaque score.
- Learning Analytics with learners, starts, completion, average watch, 50/80% milestones, and question counts.
- Student status view with anonymized identifiers and last observed state.
- Questions view with timestamp preview, Admin answer, and resolve action.
- Video Versions view with processing, ready, retired, and errored state.

## Privacy and security

All new learner tables have RLS enabled and owner-scoped authenticated policies. Admin reads and mutations use the trusted server Admin guard. No service credentials are sent to browser components. No raw email or profile data is rendered in the student status panel. Preview playback remains ready-only and progress-free.

## Mux

Mux remains the primary provider. Uploads continue to use direct browser-to-Mux upload URLs; RAPID does not proxy video bytes. Mux webhook signatures remain required. Mux Data is optional and is not a release blocker; current dashboards use first-party session and segment evidence. A future Mux Data adapter may enrich retention analysis without changing the core schema.

## Migration and release notes

Migration: `20260907100000_course_intelligence_v3.sql`.

- Local migration replay/list check: PASS.
- Local Supabase security advisor: PASS, no issues found.
- The migration is additive and contains no table/column/data deletion.
- Remote Production migration is intentionally not applied until Preview QA passes and the release gate is explicitly reached.

## Deferred P1

- Optional Mux Data retention enrichment and per-second hotspot visualization.
- Background aggregation for large datasets.
- A dedicated Admin version comparison player.

