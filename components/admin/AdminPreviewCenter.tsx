"use client";

import { useState } from "react";
import {
  ProfessorSecondaryPreview,
  StudentWorkspacePreview,
} from "@/components/admin/WorkspacePreviewViews";
import {
  ProfessorPreviewView,
  ProfessorWorkspaceHome,
  ProfessorWorkspaceLab,
  ProfessorSubscriptionMode,
} from "@/components/workspace/ProfessorWorkspaceHome";
import type { StudentWorkspaceHref } from "@/components/workspace/StudentWorkspaceNavigation";

type PreviewWorkspace = "student" | "professor";
type StudentCourseState = "locked" | "lab_basic" | "course_full";
type StudentLabState = "none" | "active" | "readonly";
type ProfessorSubscriptionState =
  | "trial"
  | "standard"
  | "plus"
  | "grace"
  | "readonly"
  | "none";

const studentCourseLabels: Record<StudentCourseState, string> = {
  locked: "未購買完整課程",
  lab_basic: "Lab 指定影片",
  course_full: "完整課程永久買斷",
};

const studentLabLabels: Record<StudentLabState, string> = {
  none: "未加入 Lab",
  active: "有效訂閱 Lab 成員",
  readonly: "Lab 訂閱失效唯讀",
};

const professorSubscriptionLabels: Record<ProfessorSubscriptionState, string> = {
  trial: "30 天免綁卡試用",
  standard: "Standard 訂閱中",
  plus: "Plus 訂閱中",
  grace: "付款寬限 15 天",
  readonly: "訂閱失效唯讀",
  none: "尚未啟用訂閱",
};

function FieldLabel({ children }: { children: string }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
      {children}
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function PreviewManagerPanel({
  studentCount,
  assistantCount,
  subscriptionMode,
  onAction,
}: {
  studentCount: number;
  assistantCount: number;
  subscriptionMode: ProfessorSubscriptionMode;
  onAction: (message: string) => void;
}) {
  const disabled = subscriptionMode !== "functional";

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">Create Lab</p>
        <h2 className="mt-2 text-xl font-semibold text-white">建立正式實驗室</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Preview 顯示目前權限下能否建立或管理 Lab；不會建立任何真實資料。
        </p>
        <button type="button" disabled={disabled} onClick={() => onAction("已模擬建立 Lab 的成功狀態；沒有新增任何資料。")} className="mt-5 w-full rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50">
          {disabled ? "唯讀狀態不可建立" : "模擬建立 Lab"}
        </button>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">Invite & Seats</p>
        <h2 className="mt-2 text-xl font-semibold text-white">學生與助手管理</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"><p className="text-xs text-slate-400">Active students</p><p className="mt-2 text-2xl font-semibold">{studentCount}</p></div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"><p className="text-xs text-slate-400">Active assistants</p><p className="mt-2 text-2xl font-semibold">{assistantCount} / 3</p></div>
        </div>
        <button type="button" disabled={disabled} onClick={() => onAction("已模擬產生邀請碼 RAPID-DEMO-2026；不會建立或消耗真實邀請碼。")} className="mt-4 w-full rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50">
          {disabled ? "訂閱失效，不可產生邀請碼" : "模擬產生邀請碼"}
        </button>
      </div>
    </section>
  );
}

function buildPreviewLab(studentCount: number): ProfessorWorkspaceLab[] {
  const demoStudents = [
    {
      id: "preview-student-01",
      name: "林同學",
      email: "lin.student@example.test",
      degree: "碩二",
      researchArea: "智慧製造",
      joinedAt: "2026-08-02T09:00:00.000Z",
      latestSummary: {
        summary: "文獻缺口與方法選擇仍待聚焦，建議下次 Meeting 先確認研究問題。",
        riskLevel: "medium" as const,
        issueTags: ["literature_gap", "meeting_prep"],
        completedAt: "2026-08-20T08:30:00.000Z",
        createdAt: "2026-08-20T08:00:00.000Z",
      },
    },
    {
      id: "preview-student-02",
      name: "王同學",
      email: "wang.student@example.test",
      degree: "碩一",
      researchArea: "資料分析",
      joinedAt: "2026-08-04T09:00:00.000Z",
      latestSummary: {
        summary: "實驗結果邏輯已完成第一輪修正，可準備與指導教授確認下一步。",
        riskLevel: "low" as const,
        issueTags: ["experiment_logic"],
        completedAt: "2026-08-19T08:30:00.000Z",
        createdAt: "2026-08-19T08:00:00.000Z",
      },
    },
    {
      id: "preview-student-03",
      name: "陳同學",
      email: "chen.student@example.test",
      degree: "博士班",
      researchArea: "系統工程",
      joinedAt: "2026-08-08T09:00:00.000Z",
      latestSummary: {
        summary: "口試前簡報需要重新安排論證順序，建議優先修正圖表與結論對應。",
        riskLevel: "high" as const,
        issueTags: ["presentation", "logic_gap"],
        completedAt: "2026-08-18T08:30:00.000Z",
        createdAt: "2026-08-18T08:00:00.000Z",
      },
    },
  ];

  return [
    {
      id: "preview-lab",
      name: "智慧製造研究室",
      institution: "臺灣科技大學",
      isOwner: true,
      students: Array.from({ length: studentCount }, (_, index) => {
        const source = demoStudents[index % demoStudents.length];
        return {
          ...source,
          id: `${source.id}-${index + 1}`,
          name: index < demoStudents.length ? source.name : `研究生 ${index + 1}`,
          email: index < demoStudents.length ? source.email : `student-${index + 1}@example.test`,
        };
      }),
    },
  ];
}

export function AdminPreviewCenter() {
  const [workspace, setWorkspace] = useState<PreviewWorkspace>("student");
  const [studentPreviewHref, setStudentPreviewHref] =
    useState<StudentWorkspaceHref>("/dashboard");
  const [professorPreviewView, setProfessorPreviewView] =
    useState<ProfessorPreviewView>("dashboard");
  const [studentCourse, setStudentCourse] = useState<StudentCourseState>("lab_basic");
  const [studentLab, setStudentLab] = useState<StudentLabState>("active");
  const [professorSubscription, setProfessorSubscription] =
    useState<ProfessorSubscriptionState>("trial");
  const [studentCount, setStudentCount] = useState(12);
  const [assistantCount, setAssistantCount] = useState(2);
  const [previewActionMessage, setPreviewActionMessage] = useState<string | null>(null);

  const professorSubscriptionMode: ProfessorSubscriptionMode =
    professorSubscription === "trial" ||
    professorSubscription === "standard" ||
    professorSubscription === "plus" ||
    professorSubscription === "grace"
      ? "functional"
      : professorSubscription === "none"
        ? "none"
        : "read_only";
  const professorPlanKey =
    professorSubscription === "plus" ? "professor_lab_plus" : "professor_lab_standard";
  const professorStatus =
    professorSubscription === "trial"
      ? "trialing"
      : professorSubscription === "grace"
        ? "past_due"
        : professorSubscription === "standard" || professorSubscription === "plus"
          ? "active"
          : "canceled";
  const previewLabs =
    professorSubscription === "none" ? [] : buildPreviewLab(studentCount);
  const studentAccess = {
    course: studentCourseLabels[studentCourse],
    lab: studentLabLabels[studentLab],
    audit:
      studentLab === "active"
        ? "可使用 Lab shared pool：本月剩餘 18 次"
        : "PDF AI 稽核需加入有效訂閱 Lab",
  };

  return (
    <section className="space-y-6">
      <header className="rounded-[2rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.13),transparent_28rem),rgba(8,47,73,0.28)] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Read-only Interface Preview</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">學生與教授介面預覽中心</h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
          在左側選擇角色與目前權限狀態，右側會以與正式首頁共用的畫面元件完整呈現工作台。這裡永遠使用假資料，不能建立訂單、Lab、邀請碼、PDF、付款或操作紀錄。
        </p>
      </header>

      <div className="grid gap-6 2xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-blue-950/20 2xl:sticky 2xl:top-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">目前狀態設定</p>
          <h3 className="mt-2 text-xl font-semibold text-white">選擇工作台與權限</h3>
          <div className="mt-6 space-y-5">
            <SelectField
              label="預覽工作台"
              value={workspace}
              onChange={(value) => {
                setWorkspace(value);
                setPreviewActionMessage(null);
              }}
              options={[{ value: "student", label: "學生工作台" }, { value: "professor", label: "教授 Lab Dashboard" }]}
            />

            {workspace === "student" ? (
              <>
                <SelectField
                  label="課程權限"
                  value={studentCourse}
                  onChange={setStudentCourse}
                  options={(Object.entries(studentCourseLabels) as [StudentCourseState, string][]).map(([value, label]) => ({ value, label }))}
                />
                <SelectField
                  label="Lab / 訂閱狀態"
                  value={studentLab}
                  onChange={setStudentLab}
                  options={(Object.entries(studentLabLabels) as [StudentLabState, string][]).map(([value, label]) => ({ value, label }))}
                />
              </>
            ) : (
              <>
                <SelectField
                  label="Professor 訂閱狀態"
                  value={professorSubscription}
                  onChange={setProfessorSubscription}
                  options={(Object.entries(professorSubscriptionLabels) as [ProfessorSubscriptionState, string][]).map(([value, label]) => ({ value, label }))}
                />
                <div>
                  <FieldLabel>Lab active students</FieldLabel>
                  <input type="number" min={0} max={30} value={studentCount} onChange={(event) => setStudentCount(Math.max(0, Math.min(30, Number(event.target.value) || 0)))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50" />
                  <p className="mt-2 text-xs leading-5 text-slate-500">Standard：0–15；Plus：0–30；第 16 位前需升級 Plus。</p>
                </div>
                <div>
                  <FieldLabel>Lab active assistants</FieldLabel>
                  <input type="number" min={0} max={3} value={assistantCount} onChange={(event) => setAssistantCount(Math.max(0, Math.min(3, Number(event.target.value) || 0)))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50" />
                  <p className="mt-2 text-xs leading-5 text-slate-500">每個 Lab 最多 3 位 active assistants。</p>
                </div>
              </>
            )}
          </div>
          <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4 text-xs leading-5 text-amber-50">
            預覽不會存取或修改真實會員資料。若要觀察真實 Lab，請使用管理者後台的「Labs」唯讀觀察頁。
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl shadow-blue-950/30">
          <div className="border-b border-white/10 bg-white/[0.035] px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">Live workspace canvas</p>
            <p className="mt-1 text-sm text-slate-400">目前情境：{workspace === "student" ? `${studentCourseLabels[studentCourse]} · ${studentLabLabels[studentLab]}` : professorSubscriptionLabels[professorSubscription]}</p>
            <p className="mt-2 text-xs text-cyan-200">
              目前頁面：{workspace === "student" ? studentPreviewHref : professorPreviewView}
            </p>
          </div>
          {previewActionMessage ? (
            <div className="border-b border-amber-300/20 bg-amber-300/10 px-6 py-3 text-sm text-amber-50">
              {previewActionMessage}
            </div>
          ) : null}
          {workspace === "student" ? (
            <StudentWorkspacePreview
              activeHref={studentPreviewHref}
              onNavigate={setStudentPreviewHref}
              courseLabel={studentAccess.course}
              labLabel={studentAccess.lab}
              auditLabel={studentAccess.audit}
              canUseAudit={studentLab === "active"}
              hasFullCourse={studentCourse === "course_full"}
              hasLabCourse={studentCourse === "lab_basic" || studentLab === "active"}
            />
          ) : professorPreviewView === "dashboard" ? (
            <ProfessorWorkspaceHome
              previewMode
              viewerName="王教授"
              viewerRole="professor"
              labs={previewLabs}
              ownedLabCount={previewLabs.length}
              subscriptionMode={professorSubscriptionMode}
              subscriptionPlanKey={professorPlanKey}
              subscriptionStatus={professorStatus}
              canManage={previewLabs.length > 0}
              onPreviewNavigate={setProfessorPreviewView}
              managerControls={<PreviewManagerPanel studentCount={studentCount} assistantCount={assistantCount} subscriptionMode={professorSubscriptionMode} onAction={setPreviewActionMessage} />}
            />
          ) : (
            <ProfessorSecondaryPreview
              view={professorPreviewView}
              onNavigate={setProfessorPreviewView}
              labs={previewLabs}
              subscriptionMode={professorSubscriptionMode}
              planLabel={professorPlanKey === "professor_lab_plus" ? "Plus" : "Standard"}
              statusLabel={professorSubscriptionLabels[professorSubscription]}
            />
          )}
        </section>
      </div>
    </section>
  );
}
