"use client";

import { FormEvent, useState } from "react";
import { AiCommandContainer } from "@/components/ai-command/AiCommandContainer";
import { AuditStreamingPanel } from "@/components/ai-audit/AuditStreamingPanel";
import { DocumentUploadForm } from "@/components/ai-audit/DocumentUploadForm";
import {
  CourseLearningExperience,
  type CourseLessonView,
} from "@/components/course/CourseLearningExperience";
import { LabJoinForm } from "@/components/labs/LabJoinForm";
import { StudentWorkspaceHome } from "@/components/workspace/StudentWorkspaceHome";
import {
  StudentWorkspaceNavigation,
  type StudentWorkspaceHref,
} from "@/components/workspace/StudentWorkspaceNavigation";
import type {
  ProfessorPreviewView,
  ProfessorSubscriptionMode,
  ProfessorWorkspaceLab,
} from "@/components/workspace/ProfessorWorkspaceHome";

type StudentWorkspacePreviewProps = {
  activeHref: StudentWorkspaceHref;
  onNavigate: (href: StudentWorkspaceHref) => void;
  courseLabel: string;
  labLabel: string;
  auditLabel: string;
  canUseAudit: boolean;
  hasFullCourse: boolean;
  hasLabCourse: boolean;
};

const previewDocuments = [
  {
    id: "preview-document-thesis",
    original_filename: "論文第三章_研究方法.pdf",
    document_type: "thesis",
    created_at: "2026-08-20T08:00:00.000Z",
  },
  {
    id: "preview-document-slides",
    original_filename: "Meeting_進度報告.pdf",
    document_type: "slides",
    created_at: "2026-08-18T09:30:00.000Z",
  },
];

const allPreviewLessons: CourseLessonView[] = [
  {
    id: "preview-public",
    slug: "meeting-storyline",
    moduleKey: "Research",
    title: "Meeting 前先建立研究敘事",
    description: "把研究問題、證據與下一步整理成教授容易追問的結構。",
    accessLevel: "public_preview",
    materialUrl: null,
    sortOrder: 1,
    progress: { status: "completed", progressSeconds: 420 },
  },
  {
    id: "preview-lab",
    slug: "lab-progress-update",
    moduleKey: "Presentation",
    title: "Lab 進度報告的重點安排",
    description: "團隊成員可觀看的 Lab 指定內容。",
    accessLevel: "lab_basic",
    materialUrl: null,
    sortOrder: 2,
    progress: { status: "in_progress", progressSeconds: 180 },
  },
  {
    id: "preview-full",
    slug: "thesis-complete-system",
    moduleKey: "Direction",
    title: "完整論文推進系統",
    description: "永久買斷完整課程後可觀看的進階內容。",
    accessLevel: "full_course",
    materialUrl: null,
    sortOrder: 3,
    progress: null,
  },
];

function PreviewPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-blue-950/20">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
        {description}
      </p>
    </header>
  );
}

function StudentAuditPreview({
  canUseAudit,
  onNavigate,
}: {
  canUseAudit: boolean;
  onNavigate: (href: StudentWorkspaceHref) => void;
}) {
  const reason = canUseAudit
    ? null
    : "PDF AI 稽核只提供給有效 Professor Lab 內的 active student。";

  return (
    <main className="bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] px-4 py-10 text-white">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <PreviewPageHeader
          eyebrow="LAB PDF SHARED POOL"
          title="研究 PDF 上傳與 AI 稽核"
          description="這裡重用正式上傳與稽核元件。Preview 可測試選檔、模型、模式和結果狀態，但不會碰觸 Storage、AI provider 或共用額度。"
        />
        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["目前 Lab", canUseAudit ? "智慧製造研究室" : "尚未加入有效 Lab"],
            ["使用資格", canUseAudit ? "可使用" : "目前停用"],
            ["Lab 共用額度", canUseAudit ? "12 已用 · 0 處理中 · 18 剩餘" : "尚未建立"],
            ["本期額度週期", canUseAudit ? "2026/08/01 - 2026/08/31" : "尚未建立"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-lg font-semibold">{value}</p>
            </div>
          ))}
        </section>
        {reason ? (
          <p className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-5 py-4 text-sm leading-7 text-amber-100">
            {reason}
          </p>
        ) : null}
        <DocumentUploadForm
          previewMode
          canUpload={canUseAudit}
          reason={reason}
          remainingPdfAudits={canUseAudit ? 18 : 0}
          onPreviewNavigate={onNavigate}
        />
        <AuditStreamingPanel
          previewMode
          canAudit={canUseAudit}
          documents={canUseAudit ? previewDocuments : []}
          onPreviewFallback={() => onNavigate("/dashboard/ai-command")}
        />
      </section>
    </main>
  );
}

type PreviewHistoryItem = {
  id: string;
  filename: string;
  documentType: string;
  mode: string;
  model: string;
  risk: "low" | "medium" | "high";
  status: "completed" | "failed";
  createdAt: string;
  summary: string;
  markdown: string;
};

const previewHistory: PreviewHistoryItem[] = [
  {
    id: "history-1",
    filename: "論文第三章_研究方法.pdf",
    documentType: "論文",
    mode: "完整稽核",
    model: "OpenAI",
    risk: "medium",
    status: "completed",
    createdAt: "2026/08/20 16:30",
    summary: "研究方法與研究問題之間仍需要補上更明確的連結。",
    markdown: "教授可能追問\n\n1. 為什麼選擇這個方法？\n2. 對照組如何定義？\n3. 樣本限制會如何影響結論？",
  },
  {
    id: "history-2",
    filename: "Meeting_進度報告.pdf",
    documentType: "簡報",
    mode: "簡報審查",
    model: "Anthropic",
    risk: "low",
    status: "completed",
    createdAt: "2026/08/18 17:30",
    summary: "整體敘事清楚，建議補充結果限制與下一步實驗。",
    markdown: "本週建議\n\n- 補上結果限制\n- 準備下一步實驗時程\n- 將結論移到圖表後方",
  },
];

function StudentAuditHistoryPreview() {
  const [selectedId, setSelectedId] = useState(previewHistory[0].id);
  const selected =
    previewHistory.find((item) => item.id === selectedId) ?? previewHistory[0];

  return (
    <main className="bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_32rem),linear-gradient(180deg,#020617_0%,#0f172a_55%,#020617_100%)] px-4 py-10 text-white">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PreviewPageHeader
          eyebrow="AI AUDIT HISTORY"
          title="PDF 稽核歷史紀錄"
          description="點擊任一筆紀錄，可在右側切換完整結果。此處只顯示固定的示範資料。"
        />
        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/75">
            <div className="border-b border-white/10 px-6 py-5">
              <h2 className="text-xl font-semibold">最近 20 筆任務</h2>
              <p className="mt-2 text-sm text-slate-400">點擊任一列即可打開單筆稽核內容。</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/[0.03] text-slate-400">
                  <tr>
                    {['原始檔名', '文件類型', '稽核模式', '模型', '風險', '狀態', '稽核時間'].map((label) => (
                      <th key={label} className="px-4 py-4 font-medium">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewHistory.map((item) => (
                    <tr key={item.id} className={`border-t border-white/10 ${selected.id === item.id ? 'bg-cyan-400/[0.08]' : 'hover:bg-white/[0.03]'}`}>
                      <td className="px-4 py-4"><button type="button" onClick={() => setSelectedId(item.id)} className="font-medium text-white hover:text-cyan-200">{item.filename}</button></td>
                      <td className="px-4 py-4 text-slate-300">{item.documentType}</td>
                      <td className="px-4 py-4 text-slate-300">{item.mode}</td>
                      <td className="px-4 py-4 text-slate-300">{item.model}</td>
                      <td className="px-4 py-4"><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${item.risk === 'high' ? 'border-red-300/30 bg-red-400/15 text-red-100' : item.risk === 'medium' ? 'border-amber-300/30 bg-amber-400/15 text-amber-100' : 'border-emerald-300/30 bg-emerald-400/15 text-emerald-100'}`}>{item.risk}</span></td>
                      <td className="px-4 py-4"><span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">完成</span></td>
                      <td className="px-4 py-4 text-slate-400">{item.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <aside className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Selected Audit</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">{selected.filename}</h2>
            <p className="mt-5 text-sm font-semibold leading-7 text-slate-200">{selected.summary}</p>
            <pre className="mt-4 whitespace-pre-wrap rounded-3xl border border-white/10 bg-slate-900 p-5 text-sm leading-8 text-slate-100">{selected.markdown}</pre>
          </aside>
        </section>
      </section>
    </main>
  );
}

function StudentCoursePlanPreview({ hasFullCourse }: { hasFullCourse: boolean }) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <main className="bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.22),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] px-6 py-12 text-white">
      <section className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">RAPID4GRAD COURSE</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">研究生畢業加速課程<span className="block text-cyan-300">一次買斷，永久保留</span></h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">完整課程屬於學生個人帳號，不依附 Professor 或 Lab。付款完成後以永久 course_full entitlement 開通。</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {['Meeting 前建立研究敘事', '拆解文獻、簡報與寫作流程', '不依附單一 Lab 的個人課程'].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-200">{item}</div>)}
          </div>
        </div>
        <aside className="rounded-[2rem] border border-cyan-300/20 bg-slate-950/80 p-6">
          <p className="text-sm font-medium text-cyan-200">學生個人完整課程買斷</p>
          <p className="mt-5 text-4xl font-semibold">價格待公告</p>
          <ul className="mt-6 space-y-3 text-sm leading-6 text-slate-200">
            {['完整 full_course 影片', '一次付款、永久保留', '離開 Lab 後仍可觀看'].map((item) => <li key={item}>✓ {item}</li>)}
          </ul>
          <button type="button" onClick={() => setMessage(hasFullCourse ? '此情境已擁有完整課程。' : 'Preview 已模擬點擊購買；不會建立訂單或導向金流。')} className="mt-7 w-full rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">{hasFullCourse ? '已擁有完整課程' : '立即購買完整課程'}</button>
          {message ? <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-50">{message}</p> : null}
        </aside>
      </section>
    </main>
  );
}

export function StudentWorkspacePreview({
  activeHref,
  onNavigate,
  courseLabel,
  labLabel,
  auditLabel,
  canUseAudit,
  hasFullCourse,
  hasLabCourse,
}: StudentWorkspacePreviewProps) {
  const visibleLessons = allPreviewLessons.filter((lesson) => {
    if (lesson.accessLevel === "public_preview") return true;
    if (lesson.accessLevel === "lab_basic") return hasLabCourse || hasFullCourse;
    return hasFullCourse;
  });

  function preventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  let content;
  if (activeHref === "/dashboard") {
    content = (
      <StudentWorkspaceHome
        previewMode
        leadSummary={{ quiz_result: "medium", quiz_score: 6, main_tags: ["tag_literature_blocked", "tag_advisor_meeting_blocked"] }}
        advisorStyle="重視前後邏輯；報告先講結論，再回到證據與限制。"
        frequentQuestions={"你的 control group 是什麼？\n這個指標如何定義？\n和前人研究的差異在哪裡？"}
        onAdvisorStyleChange={() => undefined}
        onFrequentQuestionsChange={() => undefined}
        onSubmitAdvisorMemory={preventSubmit}
        accessSummary={{ course: courseLabel, lab: labLabel, audit: auditLabel }}
      />
    );
  } else if (activeHref === "/dashboard/ai-command") {
    content = (
      <main className="bg-slate-950 text-white">
        <div className="mx-auto w-full max-w-6xl px-4 pt-10">
          <PreviewPageHeader eyebrow="RAPID4GRAD TOOL" title="🎓 研究報告 AI 指令產生器" description="選擇研究情境，產生可貼到外部 AI 的學術指令。Preview 會在瀏覽器內完成拼接。" />
        </div>
        <AiCommandContainer previewMode initialAnonymousTrialUsed={false} isDashboardRoute />
      </main>
    );
  } else if (activeHref === "/dashboard/ai-audit") {
    content = <StudentAuditPreview canUseAudit={canUseAudit} onNavigate={onNavigate} />;
  } else if (activeHref === "/dashboard/ai-audit/history") {
    content = <StudentAuditHistoryPreview />;
  } else if (activeHref === "/dashboard/lab-join") {
    content = <main className="bg-slate-950 px-4 py-12 text-white"><LabJoinForm previewMode /></main>;
  } else if (activeHref === "/dashboard/course") {
    content = (
      <main className="bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.2),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-10 text-white">
        <div className="mx-auto w-full max-w-7xl">
          <CourseLearningExperience previewMode course={{ title: "RAPID4GRAD 課程中心", description: "依目前情境顯示可觀看的影片層級。" }} lessons={visibleLessons} isAuthenticated />
        </div>
      </main>
    );
  } else {
    content = <StudentCoursePlanPreview hasFullCourse={hasFullCourse} />;
  }

  return (
    <div className="bg-slate-950">
      <StudentWorkspaceNavigation previewMode activeHref={activeHref} onPreviewNavigate={onNavigate} />
      {content}
    </div>
  );
}

export function ProfessorSecondaryPreview({
  view,
  onNavigate,
  labs,
  subscriptionMode,
  planLabel,
  statusLabel,
}: {
  view: Exclude<ProfessorPreviewView, "dashboard">;
  onNavigate: (view: ProfessorPreviewView) => void;
  labs: ProfessorWorkspaceLab[];
  subscriptionMode: ProfessorSubscriptionMode;
  planLabel: string;
  statusLabel: string;
}) {
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  if (view === "course") {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <button type="button" onClick={() => onNavigate("dashboard")} className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200 hover:bg-white/[0.08]">← 返回 Professor Dashboard</button>
          <CourseLearningExperience previewMode course={{ title: "Professor Lab 指定課程", description: "教授與 Lab 成員可觀看的 lab_basic 影片。" }} lessons={allPreviewLessons.filter((lesson) => lesson.accessLevel !== "full_course")} isAuthenticated />
        </div>
      </main>
    );
  }

  if (view === "billing") {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <section className="mx-auto max-w-5xl">
          <button type="button" onClick={() => onNavigate("dashboard")} className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200 hover:bg-white/[0.08]">← 返回 Professor Dashboard</button>
          <PreviewPageHeader eyebrow="Professor Billing" title="Lab 訂閱管理" description="顯示目前 Professor Lab 的方案、狀態與可用權限。" />
          <section className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-7">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-semibold">{planLabel}</h2><p className="mt-2 text-slate-400">智慧製造研究室 · 月繳</p></div><span className={`rounded-full border px-4 py-2 text-sm ${subscriptionMode === 'functional' ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100' : 'border-amber-300/20 bg-amber-400/10 text-amber-100'}`}>{statusLabel}</span></div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">{[['目前週期', '2026/08/01 - 2026/08/31'], ['付款寬限', '15 天'], ['續訂', '依目前情境顯示']].map(([label, value]) => <div key={label} className="rounded-3xl bg-white/[0.04] p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 font-semibold">{value}</p></div>)}</div>
            <button type="button" onClick={() => setActionMessage('Preview 已模擬訂閱操作；不會取消、升級或建立付款。')} className="mt-7 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/15">測試訂閱操作</button>
            {actionMessage ? <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-50">{actionMessage}</p> : null}
          </section>
        </section>
      </main>
    );
  }

  const lab = labs[0];
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <button type="button" onClick={() => onNavigate("dashboard")} className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200 hover:bg-white/[0.08]">← 返回 Professor Dashboard</button>
        <PreviewPageHeader eyebrow="Lab Management" title={lab?.name ?? "尚未建立 Lab"} description="查看學生、席位與摘要；Preview 操作只更新本頁提示，不修改 membership。" />
        <section className="grid gap-4 md:grid-cols-3">{[['Active students', String(lab?.students.length ?? 0)], ['Active assistants', '2 / 3'], ['目前方案', planLabel]].map(([label, value]) => <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</section>
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-6">
          <h2 className="text-xl font-semibold">成員管理預覽</h2>
          <div className="mt-5 space-y-3">{(lab?.students ?? []).slice(0, 5).map((student) => <div key={student.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{student.name}</p><p className="text-sm text-slate-500">{student.email}</p></div><button type="button" onClick={() => setActionMessage(`Preview 已模擬移除 ${student.name}；真實 membership 未變更。`)} className="rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm text-rose-100">模擬移除</button></div>)}</div>
          {actionMessage ? <p className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-50">{actionMessage}</p> : null}
        </div>
      </section>
    </main>
  );
}
