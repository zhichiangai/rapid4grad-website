# RAPID4GRAD - Admin Workspace Preview Center

> Status: Implemented in the V2 application UI. This document defines the preview boundary and the shared rendering contract.

## Purpose

`/admin/previews` lets an authenticated Admin inspect the student and Professor workspace under controlled, representative access states. It is a product-review surface, not an impersonation feature and not an operations console.

## Safety Boundary

- The route remains protected by `requireAdminContext`.
- The preview uses fixed local demo data only.
- It never queries a selected user's profile, Lab, subscription, payment, document, audit, or action-log data.
- Navigation and form controls remain interactive so Admin can review realistic states.
- Every interaction that would normally mutate server state is intercepted in preview mode and returns a local simulation result.
- Preview must never upload a PDF, create a Lab, generate or revoke an invite, start a checkout, send email, or write an action log.
- Real operational observation remains on the role-protected Admin pages, especially `/admin/labs`.

## Shared Rendering Contract

The preview must render the same presentation components as the primary workspace landing pages:

| Shared component | Formal route that uses it | Preview role |
|---|---|---|
| `components/workspace/StudentWorkspaceNavigation.tsx` | `/dashboard` layout | Controlled in-canvas navigation |
| `components/workspace/StudentWorkspaceHome.tsx` | `/dashboard` | Student state canvas |
| `components/workspace/ProfessorWorkspaceHome.tsx` | `/professor/dashboard` | Professor subscription and Lab canvas |
| `components/ai-command/AiCommandContainer.tsx` | `/dashboard/ai-command` | Local Prompt generation without quota API |
| `components/ai-audit/DocumentUploadForm.tsx` | `/dashboard/ai-audit` | Local file validation and simulated completion |
| `components/ai-audit/AuditStreamingPanel.tsx` | `/dashboard/ai-audit` | Simulated audit output without provider calls |
| `components/labs/LabJoinForm.tsx` | `/dashboard/lab-join` | Simulated membership result without RPC |
| `components/course/CourseLearningExperience.tsx` | `/learn` | Interactive lesson selection without playback/progress API |

When the formal landing-page layout changes, update the shared component first. Do not duplicate a second static mock inside `AdminPreviewCenter`.

## Supported States

### Student

- Course: locked, Lab basic content, permanent `course_full` purchase.
- Lab: no Lab, active subscribed Lab member, subscription-expired read-only Lab member.
- PDF audit display: enabled only for the active Lab member state. The displayed balance is fixed demo data and never reflects a real Lab pool.
- The seven student navigation items switch inside the same preview canvas; the browser does not leave `/admin/previews`.
- AI Command, PDF form, audit options, history rows, Lab invite form, course viewer and course CTA expose local-only interaction feedback.

### Professor

- Subscription: no subscription, 30-day trial, Standard, Plus, payment grace period, and read-only expired state.
- Seats: 0-30 demo students and 0-3 demo assistants.
- The preview communicates the Standard 0-15 and Plus 0-30 limits but does not submit an upgrade or a membership change.
- Professor course, billing and Lab-detail controls switch to local preview pages in the same canvas.

## Explicit Non-goals

- No account switching or user impersonation.
- No raw PDF, raw audit result, prompt, token/cost, payment payload, or student video-progress visibility.
- No Admin bypass of RLS.
- No replacement for end-to-end role, billing, Storage, or provider testing.

## Validation

1. Login with an Admin account and open `/admin/previews`.
2. Switch between student and Professor workspaces.
3. Change each state control and confirm the preview canvas updates without a network mutation.
4. Click all student navigation buttons and confirm the canvas switches without changing the browser route.
5. Test Prompt generation, PDF file selection, audit simulation, Lab join, lesson selection and course CTA; confirm each returns a Preview-only message.
6. Test Professor course, billing, Lab detail and member action previews; confirm they can return to the Professor Dashboard.
7. Use browser network tools to confirm Preview actions do not call mutation APIs.
8. Confirm `/dashboard` and `/professor/dashboard` still render their corresponding shared components with real data.
