export type StudentActivationStage = "new" | "started" | "established";

export type StudentActivationStep = "thesis" | "meeting" | "weekly";

export type StudentActivationState = {
  hasThesisSetup: boolean;
  hasMeeting: boolean;
  hasCurrentWeekly: boolean;
  hasAnyAction: boolean;
  completedCoreSteps: number;
  stage: StudentActivationStage;
  nextStep: StudentActivationStep | null;
};

export type StudentActivationInput = Pick<
  StudentActivationState,
  "hasThesisSetup" | "hasMeeting" | "hasCurrentWeekly" | "hasAnyAction"
>;

export function deriveStudentActivationState(
  input: StudentActivationInput,
): StudentActivationState {
  const completedCoreSteps = [
    input.hasThesisSetup,
    input.hasMeeting,
    input.hasCurrentWeekly,
  ].filter(Boolean).length;

  const stage: StudentActivationStage =
    completedCoreSteps === 3
      ? "established"
      : completedCoreSteps > 0
        ? "started"
        : "new";

  return {
    ...input,
    completedCoreSteps,
    stage,
    nextStep: input.hasThesisSetup
      ? input.hasMeeting
        ? input.hasCurrentWeekly
          ? null
          : "weekly"
        : "meeting"
      : "thesis",
  };
}

export const activationStepLabels: Record<StudentActivationStep, string> = {
  thesis: "設定目前論文階段",
  meeting: "加入下一場 Meeting",
  weekly: "留下本週研究進度",
};

export const activationStepHrefs: Record<StudentActivationStep, string> = {
  thesis: "/dashboard/thesis",
  meeting: "/dashboard/meetings",
  weekly: "/dashboard/weekly-check-in",
};
