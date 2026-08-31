import { addTaipeiDays, todayTaipeiDate } from "@/lib/meeting-actions/action-time";

export type ActionStatus = "todo" | "doing" | "done" | "canceled";
export type ActionOwnerType = "student" | "supervisor";

export type MeetingActionRecord = {
  id: string;
  meeting_id: string;
  lab_id: string;
  student_user_id: string;
  title: string;
  owner_type: ActionOwnerType;
  owner_user_id: string;
  due_date: string | null;
  status: ActionStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  meeting_at?: string;
  lab_name?: string;
};

export type GroupedActions = {
  overdue: MeetingActionRecord[];
  dueSoon: MeetingActionRecord[];
  otherOpen: MeetingActionRecord[];
  history: MeetingActionRecord[];
};

export function isOpenAction(action: Pick<MeetingActionRecord, "status">) {
  return action.status === "todo" || action.status === "doing";
}
export function isActionOverdue(action: Pick<MeetingActionRecord, "status" | "due_date">, today = todayTaipeiDate()) {
  return isOpenAction(action) && Boolean(action.due_date && action.due_date < today);
}

export function isActionDueSoon(action: Pick<MeetingActionRecord, "status" | "due_date">, today = todayTaipeiDate()) {
  return isOpenAction(action) && Boolean(action.due_date && action.due_date >= today && action.due_date <= addTaipeiDays(today, 14));
}

export function actionStatusLabel(status: ActionStatus) {
  return { todo: "待完成", doing: "進行中", done: "已完成", canceled: "已取消" }[status];
}

export function actionOwnerLabel(action: Pick<MeetingActionRecord, "owner_type" | "owner_user_id">, userId?: string) {
  if (action.owner_type === "student") return userId && action.owner_user_id === userId ? "你" : "學生";
  return userId && action.owner_user_id === userId ? "你" : "研究指導端";
}

function byDueDate(left: MeetingActionRecord, right: MeetingActionRecord) {
  if (!left.due_date && !right.due_date) return 0;
  if (!left.due_date) return 1;
  if (!right.due_date) return -1;
  return left.due_date.localeCompare(right.due_date);
}

export function groupStudentActions(actions: MeetingActionRecord[], today = todayTaipeiDate()): GroupedActions {
  const overdue = actions.filter((action) => isActionOverdue(action, today)).sort(byDueDate);
  const dueSoon = actions.filter((action) => isActionDueSoon(action, today)).sort(byDueDate);
  const otherOpen = actions.filter((action) => isOpenAction(action) && !isActionOverdue(action, today) && !isActionDueSoon(action, today)).sort(byDueDate);
  const history = actions.filter((action) => action.status === "done" || action.status === "canceled").sort((left, right) => right.updated_at.localeCompare(left.updated_at)).slice(0, 20);
  return { overdue, dueSoon, otherOpen, history };
}
