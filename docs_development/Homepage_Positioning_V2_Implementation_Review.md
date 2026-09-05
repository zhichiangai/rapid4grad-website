# Homepage Positioning V2 Implementation Review

## Scope

Homepage Positioning V2 is a public, frontend-only positioning redesign. It reframes RAPID4GRAD from an AI prompt generator into a student-first graduate navigation system. No authenticated workspace, Professor system, database, auth, payment, risk, weekly, meeting, action, or thesis semantics were changed.

## Positioning

- Old positioning: Academic AI Command Builder and Meeting prompt preview.
- New positioning: Graduate Navigation System / 研究生的畢業導航系統.
- Core promise: connect research progress, advisor Meetings, next actions, thesis milestones, and navigation reminders in one understandable path.
- Student-first acquisition remains the primary funnel; Professor is a secondary product path.
- Graduation Risk is described as a navigation reminder, never as graduation probability or an official graduation assessment.

## Homepage IA

1. Navigation with Product, Free Tools, Professor, Course / Guide, Login, and diagnosis CTA.
2. Hero with the graduate navigation positioning, diagnosis CTA, and a labeled static Research 360 product example.
3. Research problem statement.
4. Weekly -> Meeting -> Actions -> Thesis -> Risk -> Next Step loop.
5. Research 360 value questions.
6. Five Student Workspace capabilities.
7. Secondary Professor Supervision value.
8. AI research tools and compact learning resources.
9. Final diagnosis CTA.

## Product Evidence

The hero visual is a static CSS mock labeled `產品示意`. It does not fetch user data, call Supabase, or claim real user metrics. No fake testimonials, social proof, user counts, school counts, graduation rates, or success claims were added.

## SEO and Public Routes

Homepage metadata now uses `RAPID4GRAD｜研究生畢業導航系統` and describes research progress, Meetings, next actions, thesis milestones, and reminders. Existing `/quiz`, `/guide`, `/course`, `/login`, and `/ai-command` routes remain linked; protected workspace architecture is unchanged.

## Responsive and Accessibility

The layout uses responsive grids at 375, 768, 1024, and 1440 pixels, keeps the navigation within the viewport, and uses a native mobile disclosure menu with keyboard focus. Headings, links, labels, contrast, and non-color text communicate the primary hierarchy.

## Validation

- Homepage positioning contract: PASS
- Existing regression suite: PASS
- Migration diff: EMPTY
- Production data or Supabase QA: NOT USED
- Production: unchanged

## Preview

Branch: `homepage-positioning-v2`

Preview details will be recorded here after the branch deployment is READY. This sprint is Preview-only and must not be merged to `main` or deployed to Production before external review.

## Explicit Exclusions

No new migration, table, RLS policy, RPC, auth change, payment change, Student Workspace change, Professor Workspace change, risk rule, analytics, AI backend, onboarding flow, or Production operation.
