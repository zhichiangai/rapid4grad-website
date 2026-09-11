import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  deriveStudentActivationState,
  activationStepHrefs,
} from "../lib/student/activation";

test("activation is derived from real research records", () => {
  assert.deepEqual(
    deriveStudentActivationState({
      hasThesisSetup: false,
      hasMeeting: false,
      hasCurrentWeekly: false,
      hasAnyAction: false,
    }),
    {
      hasThesisSetup: false,
      hasMeeting: false,
      hasCurrentWeekly: false,
      hasAnyAction: false,
      completedCoreSteps: 0,
      stage: "new",
      nextStep: "thesis",
    },
  );

  const started = deriveStudentActivationState({
    hasThesisSetup: true,
    hasMeeting: false,
    hasCurrentWeekly: false,
    hasAnyAction: false,
  });
  assert.equal(started.completedCoreSteps, 1);
  assert.equal(started.stage, "started");
  assert.equal(started.nextStep, "meeting");

  const twoOfThree = deriveStudentActivationState({
    hasThesisSetup: true,
    hasMeeting: true,
    hasCurrentWeekly: false,
    hasAnyAction: false,
  });
  assert.equal(twoOfThree.completedCoreSteps, 2);
  assert.equal(twoOfThree.stage, "started");
  assert.equal(twoOfThree.nextStep, "weekly");

  const established = deriveStudentActivationState({
    hasThesisSetup: true,
    hasMeeting: true,
    hasCurrentWeekly: true,
    hasAnyAction: true,
  });
  assert.equal(established.completedCoreSteps, 3);
  assert.equal(established.stage, "established");
  assert.equal(established.nextStep, null);
});

test("Admin Preview includes the deterministic 2/3 activation scenario", () => {
  const preview = fs.readFileSync("components/admin/AdminPreviewCenter.tsx", "utf8");
  assert.match(preview, /two_of_three: "2\/3 Personal Student"/);
  assert.match(preview, /studentActivation === "two_of_three"/);
  assert.match(preview, /hasThesisSetup: true, hasMeeting: true, hasCurrentWeekly: false/);
});

test("dashboard does not classify failed core queries as a fresh student", () => {
  const home = fs.readFileSync("components/workspace/StudentWorkspaceHome.tsx", "utf8");
  const dashboard = fs.readFileSync("app/dashboard/page.tsx", "utf8");
  assert.match(dashboard, /setActivationError\(activationDataFailed\)/);
  assert.match(dashboard, /setActivation\(activationDataFailed \? undefined/);
  assert.match(home, /目前無法確認研究進度/);
});

test("activation uses real product routes and no onboarding storage", () => {
  assert.deepEqual(activationStepHrefs, {
    thesis: "/dashboard/thesis",
    meeting: "/dashboard/meetings",
    weekly: "/dashboard/weekly-check-in",
  });
  const source = fs.readFileSync("app/dashboard/page.tsx", "utf8");
  assert.match(source, /deriveStudentActivationState/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|onboarding_progress|user_onboarding|activation_steps/);
});

test("empty student surfaces have one actionable first-use path", () => {
  const actions = fs.readFileSync("components/meeting-actions/StudentActionCenter.tsx", "utf8");
  const meetings = fs.readFileSync("components/meetings/MeetingCenter.tsx", "utf8");
  const home = fs.readFileSync("components/workspace/StudentWorkspaceHome.tsx", "utf8");
  assert.match(actions, /目前還沒有下一步。/);
  assert.match(actions, /前往 Meeting/);
  assert.match(meetings, /先記下下一場和教授討論的 Meeting。/);
  assert.match(meetings, /安排第一場 Meeting/);
  assert.match(home, /30 秒建立你的研究導航/);
  assert.doesNotMatch(home, /先設定論文進度或加入 Lab/);
});

test("PDF AI and Join Lab visibility follow active Lab relevance", () => {
  const navigation = fs.readFileSync("components/workspace/StudentWorkspaceNavigation.tsx", "utf8");
  const home = fs.readFileSync("components/workspace/StudentWorkspaceHome.tsx", "utf8");
  assert.match(navigation, /capabilities\?\.lab\.hasActiveLab !== true/);
  assert.match(navigation, /capabilities\?\.lab\.canUsePdfAudit === true/);
  assert.match(home, /pdfAuditVisible \? <><Link href="\/dashboard\/ai-audit"/);
  assert.match(home, /!hasActiveLab \? <Link href="\/dashboard\/lab-join"/);
});
