import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("Professor Supervision keeps the three-surface information architecture", () => {
  const dashboard = read("components/workspace/ProfessorWorkspaceHome.tsx");
  const student = read("components/professor/ProfessorStudentSupervision.tsx");
  const lab = read("app/professor/labs/[labId]/page.tsx");

  assert.match(dashboard, /本週研究指導中心/);
  assert.match(dashboard, /ProfessorAiEntry contextType="dashboard"/);
  assert.match(dashboard, /ProfessorThisWeekMeetings/);
  assert.match(dashboard, /ProfessorMilestonePreview/);
  assert.match(student, /Meeting Prep/);
  assert.match(student, /MeetingActionList/);
  assert.match(student, /authorized|授權/i);
  assert.match(lab, /Lab Pulse/);
  assert.match(lab, /LabPlanningPanel/);
  assert.doesNotMatch(dashboard + student + lab, /Student 360/);
});

test("Lab planning forms retain their DOM reference across async saves", () => {
  const panel = read("components/professor/LabPlanningPanel.tsx");

  assert.match(panel, /const formElement = event\.currentTarget/);
  assert.match(panel, /formElement\.reset\(\)/);
});

test("Lab planning archive mutations do not read back rows hidden by active-only RLS", () => {
  const resourceRoute = read("app/api/professor/labs/[labId]/resources/[resourceId]/route.ts");
  const milestoneRoute = read("app/api/professor/labs/[labId]/milestones/[milestoneId]/route.ts");

  assert.match(resourceRoute, /resource archive failed/);
  assert.match(resourceRoute, /resource: \{ id: resourceId, archived_at/);
  assert.match(milestoneRoute, /milestone archive failed/);
  assert.match(milestoneRoute, /milestone: \{ id: milestoneId, status: "archived" \}/);
  assert.match(resourceRoute, /payload\?\.archive === false/);
  assert.match(resourceRoute, /resource restore failed/);
});

test("Archived Lab resources are visible only to the owning active Professor", () => {
  const migration = read("supabase/migrations/20260918200700_allow_lab_owner_read_archived_resources.sql");
  assert.match(migration, /CREATE POLICY "lab_resources_select_archived_owner"/);
  assert.match(migration, /FOR SELECT TO authenticated/);
  assert.match(migration, /archived_at IS NOT NULL/);
  assert.match(migration, /app_private\.is_active_user\(\(SELECT auth\.uid\(\)\)\)/);
  assert.match(migration, /app_private\.owns_lab\(lab_id\)/);
  assert.doesNotMatch(migration, /is_active_lab_member|has_active_lab_subscription/);
  assert.doesNotMatch(migration, /DROP\s+(TABLE|COLUMN|POLICY|FUNCTION)|DELETE\s+FROM/i);
});

test("Lab planning identity triggers run safely for authenticated updates", () => {
  const migration = read("supabase/migrations/20260918112133_fix_lab_planning_trigger_execution.sql");

  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /SET search_path = public, pg_temp/);
  assert.match(migration, /REVOKE ALL ON FUNCTION/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION .* TO service_role/);
});

test("Student Supervision does not widen access to private student records", () => {
  const loader = read("lib/professor/student-supervision-data.ts");
  const page = read("app/professor/labs/[labId]/students/[studentId]/page.tsx");

  assert.match(loader, /weekly_updates/);
  assert.match(loader, /meetings/);
  assert.match(loader, /loadActionsForMeetings/);
  assert.match(loader, /get_shared_audit_summaries/);
  assert.doesNotMatch(loader, /thesis_milestones|graduation_risk|student_supervision_shares/);
  assert.match(page, /loadProfessorStudentSupervision/);
});

test("Additive migration defines only the approved Lab planning and AI operation tables", () => {
  const migration = read("supabase/migrations/20260911220429_professor_supervision_os_v1_additive.sql");

  for (const table of ["lab_milestones", "lab_resources", "ai_operations"]) {
    assert.match(migration, new RegExp(`CREATE TABLE public\\.${table}`));
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
  }
  assert.match(migration, /GRANT SELECT, INSERT, UPDATE ON TABLE public\.lab_milestones TO authenticated/);
  assert.match(migration, /GRANT SELECT, INSERT, UPDATE ON TABLE public\.lab_resources TO authenticated/);
  assert.match(migration, /'executing'/);
  assert.match(migration, /expires_at TIMESTAMPTZ NOT NULL DEFAULT .*90 days/);
  assert.doesNotMatch(migration, /student_supervision_shares/);
  assert.doesNotMatch(migration, /\bDROP\s+(TABLE|COLUMN|POLICY|FUNCTION)\b/i);
  assert.doesNotMatch(migration, /\bDELETE\s+FROM\b/i);
});

test("AI gateway requires validated proposals and reuses canonical meeting actions", () => {
  const contract = read("lib/professor/ai-contract.ts");
  const gateway = read("lib/professor/ai-gateway.ts");
  const textRoute = read("app/api/professor/ai/route.ts");
  const confirmRoute = read("app/api/professor/ai/operations/[operationId]/confirm/route.ts");

  assert.match(contract, /validateProposal/);
  assert.match(contract, /create_student_action/);
  assert.match(gateway, /meeting_actions/);
  assert.match(gateway, /completed/);
  assert.match(gateway, /getLabMutationAccess/);
  assert.match(gateway, /claimProfessorOperation/);
  assert.match(textRoute, /compileProfessorContext/);
  assert.match(textRoute, /GROQ_DATA_PROCESSING_APPROVAL_REQUIRED/);
  assert.match(confirmRoute, /executeProfessorTool/);
  assert.match(confirmRoute, /status.*proposed|proposed.*status/);
  assert.match(confirmRoute, /409/);
  assert.doesNotMatch(gateway, /student_supervision_shares|thesis_milestones|graduation_risk/);
});

test("Voice keeps the approved limits and never persists raw audio", () => {
  const route = read("app/api/professor/ai/voice/route.ts");
  const groq = read("lib/professor/groq.ts");
  const ui = read("components/professor/ProfessorAiEntry.tsx");

  assert.match(route, /120/);
  assert.match(route, /300/);
  assert.match(route, /0\.8/);
  assert.match(route, /usedSeconds \+ durationSeconds > MONTHLY_SECONDS/);
  assert.match(route, /audio_seconds/);
  assert.doesNotMatch(route, /storage\.from|writeFile|rawAudio|audio_blob/i);
  assert.match(groq, /GROQ_TEXT_MODEL/);
  assert.match(groq, /GROQ_STT_MODEL/);
  assert.match(groq, /api\.groq\.com\/openai\/v1/);
  assert.match(groq, /GROQ_API_KEY_CONFIGURATION_REQUIRED/);
  assert.match(groq, /json_schema/);
  assert.doesNotMatch(groq, /NEXT_PUBLIC_GROQ_API_KEY/);
  assert.match(ui, /120_000/);
  assert.match(ui, /precision/);
  assert.match(ui, /使用精準模型重試/);
  assert.match(ui, /quotaWarning/);
});

test("Lab Hub keeps a usable mobile surface instead of forcing horizontal overflow", () => {
  const lab = read("app/professor/labs/[labId]/page.tsx");

  assert.match(lab, /hidden overflow-hidden rounded-2xl border border-white\/10 md:block/);
  assert.match(lab, /grid gap-3 md:hidden/);
  assert.match(lab, /min-w-\[900px\]/);
});
