export const THESIS_MILESTONES = [
  { key: "research_direction", order: 1, label: "研究方向與題目", description: "確認研究問題、研究範圍與主要目標。" },
  { key: "literature_review", order: 2, label: "文獻回顧", description: "建立研究背景、找出研究缺口並整理核心文獻。" },
  { key: "methodology", order: 3, label: "研究方法與實驗設計", description: "確認研究方法、模型、實驗或資料分析流程。" },
  { key: "proposal", order: 4, label: "研究計畫 / Proposal", description: "形成可以和指導教授確認的完整研究計畫。" },
  { key: "research_execution", order: 5, label: "研究執行與資料收集", description: "進行實驗、模擬、訪談、資料蒐集或主要研究工作。" },
  { key: "analysis_results", order: 6, label: "分析與結果整理", description: "整理資料、完成分析並形成主要研究結果。" },
  { key: "writing_revision", order: 7, label: "論文撰寫與修改", description: "完成主要章節並依指導意見持續修改。" },
  { key: "defense_graduation", order: 8, label: "口試與畢業準備", description: "完成口試、最終修訂與學校畢業程序。" },
] as const;

export type ThesisMilestoneKey = (typeof THESIS_MILESTONES)[number]["key"];
export type ThesisMilestoneStatus = "not_started" | "in_progress" | "blocked" | "completed";

export type ThesisMilestoneRow = {
  id?: string;
  student_user_id: string;
  milestone_key: ThesisMilestoneKey;
  status: ThesisMilestoneStatus;
  target_date: string | null;
  note: string | null;
  completed_at: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ThesisMilestoneView = ThesisMilestoneRow & (typeof THESIS_MILESTONES)[number];

export function mergeMilestoneDefinitionsWithRows(studentUserId: string, rows: ThesisMilestoneRow[]) {
  const rowMap = new Map(rows.map((row) => [row.milestone_key, row]));
  return THESIS_MILESTONES.map((definition) => ({
    ...definition,
    student_user_id: studentUserId,
    milestone_key: definition.key,
    status: rowMap.get(definition.key)?.status ?? "not_started",
    target_date: rowMap.get(definition.key)?.target_date ?? null,
    note: rowMap.get(definition.key)?.note ?? null,
    completed_at: rowMap.get(definition.key)?.completed_at ?? null,
    id: rowMap.get(definition.key)?.id,
    created_at: rowMap.get(definition.key)?.created_at,
    updated_at: rowMap.get(definition.key)?.updated_at,
  } satisfies ThesisMilestoneView));
}

export function getCurrentThesisMilestone(milestones: ThesisMilestoneView[]) {
  return milestones.find((milestone) => milestone.status === "blocked")
    ?? milestones.find((milestone) => milestone.status === "in_progress")
    ?? milestones.find((milestone) => milestone.status === "not_started")
    ?? null;
}

export function getCompletedMilestoneCount(milestones: Pick<ThesisMilestoneView, "status">[]) {
  return milestones.filter((milestone) => milestone.status === "completed").length;
}

export function getThesisProgressSummary(milestones: ThesisMilestoneView[]) {
  const current = getCurrentThesisMilestone(milestones);
  return {
    completedCount: getCompletedMilestoneCount(milestones),
    totalCount: THESIS_MILESTONES.length,
    current,
    allCompleted: current === null,
  };
}

export function statusLabel(status: ThesisMilestoneStatus) {
  return { not_started: "未開始", in_progress: "進行中", blocked: "卡住", completed: "已完成" }[status];
}
