import type { QuizOptionValue } from "./questions";

export type RiskLevel = "low" | "medium" | "high";

export interface QuizScoreResult {
  score: number;
  riskLevel: RiskLevel;
  tags: string[];
}

const OPTION_SCORES: Record<QuizOptionValue, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 0,
};

const TAG_RULES: Array<{
  questionId: string;
  tag: string;
  values: QuizOptionValue[];
}> = [
  {
    questionId: "q3",
    tag: "tag_literature_blocked",
    values: ["B", "C"],
  },
  {
    questionId: "q4",
    tag: "tag_advisor_meeting_blocked",
    values: ["B", "C"],
  },
  {
    questionId: "q5",
    tag: "tag_presentation_blocked",
    values: ["B", "C"],
  },
  {
    questionId: "q6",
    tag: "tag_tooling_blocked",
    values: ["B", "C"],
  },
  {
    questionId: "q7",
    tag: "tag_high_stress",
    values: ["C"],
  },
];

function isQuizOptionValue(value: string | undefined): value is QuizOptionValue {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

function getAnswerScore(value: string | undefined) {
  if (!isQuizOptionValue(value)) return 0;
  return OPTION_SCORES[value];
}

export function calculateRiskScore(
  answers: Record<string, string>,
): QuizScoreResult {
  let score = 0;

  for (const value of Object.values(answers)) {
    score += getAnswerScore(value);
  }

  if (answers.q1 === "C") {
    score += 2;
  }

  if (answers.q2 === "A") {
    score += 2;
  }

  const forcedHighRisk = answers.q4 === "C" && answers.q7 === "C";
  const riskLevel: RiskLevel =
    forcedHighRisk || score >= 9
      ? "high"
      : score >= 5
        ? "medium"
        : "low";

  const tags = TAG_RULES.flatMap(({ questionId, tag, values }) => {
    const answer = answers[questionId];
    return isQuizOptionValue(answer) && values.includes(answer) ? [tag] : [];
  });

  return {
    score,
    riskLevel,
    tags,
  };
}
