import { addTaipeiDays, todayTaipeiDate } from "@/lib/meeting-actions/action-time";

export type GraduationRiskStatus = "urgent" | "attention" | "stable" | "setup_needed";
export type GraduationRiskSeverity = "urgent" | "attention";
export type GraduationRiskSource = "thesis" | "actions" | "weekly" | "meetings";

export type RiskThesisMilestone = {
  milestone_key: string;
  status: string;
  target_date: string | null;
};

export type RiskAction = {
  status: string;
  due_date: string | null;
  owner_type: string;
  owner_user_id: string;
  student_user_id: string;
};

export type RiskMeeting = { status: string; meeting_at: string };
export type RiskWeekly = { updated_at: string };

export type GraduationRiskSignal = {
  key: string;
  severity: GraduationRiskSeverity;
  title: string;
  reason: string;
  recommendation: string;
  href: "/dashboard/thesis" | "/dashboard/actions" | "/dashboard/weekly-check-in" | "/dashboard/meetings";
  source: GraduationRiskSource;
};

export type GraduationRiskResult = {
  status: GraduationRiskStatus;
  signals: GraduationRiskSignal[];
  primary: GraduationRiskSignal | null;
};

const milestoneOrder = ["research_direction", "literature_review", "methodology", "proposal", "research_execution", "analysis_results", "writing_revision", "defense_graduation"];
const milestoneLabels: Record<string, string> = {
  research_direction: "研究方向與題目",
  literature_review: "文獻回顧",
  methodology: "研究方法與實驗設計",
  proposal: "研究計畫 / Proposal",
  research_execution: "研究執行與資料收集",
  analysis_results: "分析與結果整理",
  writing_revision: "論文撰寫與修改",
  defense_graduation: "口試與畢業準備",
};
const priority = ["thesis_blocked", "overdue_action", "update_overdue", "thesis_target_overdue", "no_recent_update", "deadline_soon", "thesis_target_soon", "no_recent_meeting"];

function daysBetween(left: string, right: string) {
  return Math.floor((Date.parse(`${right}T00:00:00Z`) - Date.parse(`${left}T00:00:00Z`)) / 86400000);
}

function taipeiDateFromIso(value: string) {
  return todayTaipeiDate(new Date(value));
}

function milestoneLabel(key: string) {
  return milestoneLabels[key] ?? "論文里程碑";
}

export function sortGraduationRiskSignals(signals: GraduationRiskSignal[]) {
  return [...signals].sort((a, b) => priority.indexOf(a.key) - priority.indexOf(b.key));
}

export function deriveGraduationRiskSignals(input: {
  now?: Date;
  today?: string;
  activeLab: boolean;
  joinedAt?: string | null;
  latestWeekly: RiskWeekly | null;
  meetings: RiskMeeting[];
  actions: RiskAction[];
  thesisMilestones: RiskThesisMilestone[];
}): GraduationRiskSignal[] {
  const today = input.today ?? todayTaipeiDate(input.now);
  const now = input.now ?? new Date();
  const signals: GraduationRiskSignal[] = [];
  const blocked = input.thesisMilestones.filter((milestone) => milestone.status === "blocked").sort((a, b) => milestoneOrder.indexOf(a.milestone_key) - milestoneOrder.indexOf(b.milestone_key))[0];
  if (blocked) signals.push({ key: "thesis_blocked", severity: "urgent", title: `${milestoneLabel(blocked.milestone_key)}目前卡住`, reason: `你在「${milestoneLabel(blocked.milestone_key)}」標記了卡住，這是目前最值得先處理的論文進度。`, recommendation: "先更新這個里程碑，整理需要討論的問題。", href: "/dashboard/thesis", source: "thesis" });

  const overdueActions = input.actions.filter((action) => action.student_user_id === action.owner_user_id && action.owner_type === "student" && (action.status === "todo" || action.status === "doing") && Boolean(action.due_date && action.due_date < today));
  if (overdueActions.length) signals.push({ key: "overdue_action", severity: "urgent", title: `${overdueActions.length} 項研究行動已逾期`, reason: `有 ${overdueActions.length} 項由你負責的下一步已超過截止日期。`, recommendation: "先打開我的下一步，決定要完成或重新整理行動。", href: "/dashboard/actions", source: "actions" });

  const weeklyAge = input.latestWeekly ? daysBetween(taipeiDateFromIso(input.latestWeekly.updated_at), today) : null;
  if (input.activeLab && weeklyAge !== null && weeklyAge >= 14) signals.push({ key: "update_overdue", severity: "urgent", title: "Weekly 已超過兩週未更新", reason: "最近一次 Weekly 更新距今已達 14 天以上。", recommendation: "先填寫本週研究進度，重新建立研究節奏。", href: "/dashboard/weekly-check-in", source: "weekly" });
  else if (input.activeLab && weeklyAge !== null && weeklyAge >= 7) signals.push({ key: "no_recent_update", severity: "attention", title: "Weekly 最近較少更新", reason: "最近一次 Weekly 更新距今已達 7 天以上。", recommendation: "更新本週研究進度，讓下一步更清楚。", href: "/dashboard/weekly-check-in", source: "weekly" });
  else if (input.activeLab && weeklyAge === null && input.joinedAt && daysBetween(taipeiDateFromIso(input.joinedAt), today) >= 7) signals.push({ key: "no_recent_update", severity: "attention", title: "還沒有 Weekly 更新", reason: "加入 Lab 後尚未留下本週研究進度。", recommendation: "填寫第一筆 Weekly，建立可追蹤的研究節奏。", href: "/dashboard/weekly-check-in", source: "weekly" });

  const targetOverdue = input.thesisMilestones.filter((milestone) => milestone.status !== "completed" && milestone.target_date && milestone.target_date < today).sort((a, b) => a.target_date!.localeCompare(b.target_date!))[0];
  if (targetOverdue) {
    const days = daysBetween(targetOverdue.target_date!, today);
    signals.push({ key: "thesis_target_overdue", severity: days >= 7 ? "urgent" : "attention", title: `${milestoneLabel(targetOverdue.milestone_key)}目標日期已過`, reason: `你為「${milestoneLabel(targetOverdue.milestone_key)}」設定的目標日期已過 ${days} 天；這是個人導航提醒，不是學校正式期限。`, recommendation: "更新論文里程碑，確認下一個可完成的步驟。", href: "/dashboard/thesis", source: "thesis" });
  }

  const dueSoonActions = input.actions.filter((action) => action.student_user_id === action.owner_user_id && action.owner_type === "student" && (action.status === "todo" || action.status === "doing") && Boolean(action.due_date && action.due_date >= today && action.due_date <= addTaipeiDays(today, 14)));
  if (dueSoonActions.length) signals.push({ key: "deadline_soon", severity: "attention", title: `${dueSoonActions.length} 項研究行動即將到期`, reason: `有 ${dueSoonActions.length} 項由你負責的下一步將在 14 天內到期。`, recommendation: "查看我的下一步，先處理最接近截止日的行動。", href: "/dashboard/actions", source: "actions" });

  const targetSoon = input.thesisMilestones.filter((milestone) => milestone.status !== "completed" && milestone.target_date && milestone.target_date >= today && milestone.target_date <= addTaipeiDays(today, 14))[0];
  if (targetSoon) signals.push({ key: "thesis_target_soon", severity: "attention", title: `${milestoneLabel(targetSoon.milestone_key)}目標日期接近`, reason: `你為「${milestoneLabel(targetSoon.milestone_key)}」設定的目標日期在 14 天內。`, recommendation: "確認這個里程碑的下一步，必要時在 Meeting 討論。", href: "/dashboard/thesis", source: "thesis" });

  if (input.activeLab) {
    const completed = input.meetings.filter((meeting) => meeting.status === "completed").sort((a, b) => b.meeting_at.localeCompare(a.meeting_at))[0];
    const upcoming = input.meetings.some((meeting) => meeting.status === "scheduled" && new Date(meeting.meeting_at).getTime() > now.getTime());
    const noRecent = completed ? now.getTime() - new Date(completed.meeting_at).getTime() >= 21 * 86400000 : Boolean(input.joinedAt && now.getTime() - new Date(input.joinedAt).getTime() >= 21 * 86400000);
    if (noRecent && !upcoming) signals.push({ key: "no_recent_meeting", severity: "attention", title: "最近沒有研究 Meeting", reason: completed ? "最近一次完成的 Meeting 已超過 21 天，且目前沒有即將到來的 Meeting。" : "加入 Lab 已超過 21 天，尚未完成研究 Meeting，且目前沒有即將到來的 Meeting。", recommendation: "安排或準備下一次研究 Meeting。", href: "/dashboard/meetings", source: "meetings" });
  }
  return sortGraduationRiskSignals(signals);
}

export function deriveGraduationRiskStatus(input: { signals: GraduationRiskSignal[]; hasThesisRows: boolean; activeLab: boolean }): GraduationRiskStatus {
  if (input.signals.some((signal) => signal.severity === "urgent")) return "urgent";
  if (input.signals.length) return "attention";
  if (!input.hasThesisRows && !input.activeLab) return "setup_needed";
  return "stable";
}

export function getPrimaryGraduationRiskSignal(signals: GraduationRiskSignal[]) {
  return sortGraduationRiskSignals(signals)[0] ?? null;
}

export function getGraduationRiskRecommendation(status: GraduationRiskStatus) {
  if (status === "setup_needed") return { title: "先建立研究資料", reason: "目前還沒有足夠資料判斷研究節奏。先設定論文進度，或加入 Lab 後開始 Weekly / Meeting 紀錄。", href: "/dashboard/thesis" as const, label: "設定論文進度" };
  if (status === "stable") return { title: "目前沒有明顯的進度風險", reason: "你的 Weekly、Meeting、下一步與論文里程碑目前沒有觸發需要注意的規則。", href: "/dashboard/thesis" as const, label: "查看論文進度" };
  return null;
}
