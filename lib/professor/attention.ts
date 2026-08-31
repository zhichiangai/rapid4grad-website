import { getTaipeiDate } from "@/lib/supervision/week";

export type AttentionSeverity = "urgent" | "attention" | "healthy";
export type AttentionSignal =
  | "help_soon"
  | "blocked"
  | "update_overdue"
  | "overdue_action"
  | "high_risk"
  | "slightly_behind"
  | "no_recent_update"
  | "deadline_soon"
  | "no_recent_meeting";

export type AttentionWeekly = {
  weekStart: string;
  completedSummary: string;
  blockers: string | null;
  nextPlan: string;
  selfStatus: string;
  needsProfessorHelp: string;
  updatedAt: string;
};

export type AttentionStudent = {
  studentId: string;
  labId: string;
  labName: string;
  name: string;
  degree: string | null;
  researchArea: string | null;
  severity: AttentionSeverity;
  signals: AttentionSignal[];
  latestWeekly: AttentionWeekly | null;
  overdueActionCount: number;
  deadlineSoonCount: number;
  nextMeetingAt: string | null;
  lastCompletedMeetingAt: string | null;
  latestAuditRisk: "low" | "medium" | "high" | null;
  lastActivityAt: string | null;
};

const signalOrder: AttentionSignal[] = [
  "help_soon",
  "blocked",
  "update_overdue",
  "overdue_action",
  "high_risk",
  "slightly_behind",
  "no_recent_update",
  "deadline_soon",
  "no_recent_meeting",
];

const urgentSignals = new Set<AttentionSignal>([
  "help_soon",
  "blocked",
  "update_overdue",
  "overdue_action",
  "high_risk",
]);

const labels: Record<AttentionSignal, string> = {
  help_soon: "希望近期協助",
  blocked: "目前卡住",
  update_overdue: "兩週以上沒有更新",
  overdue_action: "有逾期行動項目",
  high_risk: "最近研究稽核為高風險",
  slightly_behind: "進度稍微落後",
  no_recent_update: "一週以上沒有更新",
  deadline_soon: "近期有行動期限",
  no_recent_meeting: "近期沒有研究 Meeting",
};

function taipeiDay(value: string) {
  return new Date(`${value}T00:00:00+08:00`).getTime();
}

function daysSince(value: string, today: string) {
  return Math.floor((taipeiDay(today) - taipeiDay(value)) / 86_400_000);
}

export function attentionSignalLabel(signal: AttentionSignal) {
  return labels[signal];
}

export function deriveAttention(input: {
  studentId: string;
  labId: string;
  labName: string;
  name: string;
  degree: string | null;
  researchArea: string | null;
  joinedAt: string;
  weekly: AttentionWeekly | null;
  overdueActionCount: number;
  deadlineSoonCount: number;
  nextMeetingAt: string | null;
  lastCompletedMeetingAt: string | null;
  latestAuditRisk: "low" | "medium" | "high" | null;
  now?: Date;
}): AttentionStudent {
  const today = getTaipeiDate(input.now ?? new Date());
  const signals: AttentionSignal[] = [];
  const referenceDate = input.weekly?.updatedAt ?? input.joinedAt;
  const age = daysSince(getTaipeiDate(new Date(referenceDate)), today);

  if (input.weekly?.needsProfessorHelp === "soon") signals.push("help_soon");
  if (input.weekly?.selfStatus === "blocked") signals.push("blocked");
  if (input.weekly?.selfStatus === "slightly_behind") signals.push("slightly_behind");

  if (input.weekly ? age >= 14 : age >= 14) signals.push("update_overdue");
  else if (input.weekly ? age >= 7 : age >= 7) signals.push("no_recent_update");

  if (input.overdueActionCount > 0) signals.push("overdue_action");
  if (input.deadlineSoonCount > 0) signals.push("deadline_soon");
  if (input.latestAuditRisk === "high") signals.push("high_risk");
  if (
    input.lastCompletedMeetingAt &&
    daysSince(getTaipeiDate(new Date(input.lastCompletedMeetingAt)), today) >= 21 &&
    !input.nextMeetingAt
  ) {
    signals.push("no_recent_meeting");
  }

  const orderedSignals = signalOrder.filter((signal) => signals.includes(signal));
  const severity = orderedSignals.some((signal) => urgentSignals.has(signal))
    ? "urgent"
    : orderedSignals.length > 0
      ? "attention"
      : "healthy";

  const activityValues = [
    input.weekly?.updatedAt,
    input.lastCompletedMeetingAt,
  ].filter((value): value is string => Boolean(value));

  return {
    studentId: input.studentId,
    labId: input.labId,
    labName: input.labName,
    name: input.name,
    degree: input.degree,
    researchArea: input.researchArea,
    severity,
    signals: orderedSignals,
    latestWeekly: input.weekly,
    overdueActionCount: input.overdueActionCount,
    deadlineSoonCount: input.deadlineSoonCount,
    nextMeetingAt: input.nextMeetingAt,
    lastCompletedMeetingAt: input.lastCompletedMeetingAt,
    latestAuditRisk: input.latestAuditRisk,
    lastActivityAt: activityValues.sort().at(-1) ?? null,
  };
}

export function sortAttentionStudents(students: AttentionStudent[]) {
  return [...students].sort((a, b) => {
    const severityRank = { urgent: 0, attention: 1, healthy: 2 };
    const bySeverity = severityRank[a.severity] - severityRank[b.severity];
    if (bySeverity !== 0) return bySeverity;
    const signalRank = (student: AttentionStudent) =>
      Math.min(...student.signals.map((signal) => signalOrder.indexOf(signal)), signalOrder.length);
    const bySignal = signalRank(a) - signalRank(b);
    if (bySignal !== 0) return bySignal;
    return (a.lastActivityAt ?? "0000").localeCompare(b.lastActivityAt ?? "0000");
  });
}
