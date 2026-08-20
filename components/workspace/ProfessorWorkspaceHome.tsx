import Link from "next/link";
import { ReactNode } from "react";

export type ProfessorWorkspaceRole = "professor" | "assistant" | "admin";
export type ProfessorSubscriptionMode = "functional" | "read_only" | "none";
export type ProfessorPreviewView = "dashboard" | "course" | "billing" | "lab";

export type ProfessorWorkspaceStudent = {
  id: string;
  name: string;
  email: string;
  degree: string | null;
  researchArea: string | null;
  joinedAt: string;
  latestSummary: {
    summary: string;
    riskLevel: "low" | "medium" | "high" | null;
    issueTags: string[];
    completedAt: string | null;
    createdAt: string;
  } | null;
};

export type ProfessorWorkspaceLab = {
  id: string;
  name: string;
  institution: string | null;
  isOwner: boolean;
  students: ProfessorWorkspaceStudent[];
};

type ProfessorWorkspaceHomeProps = {
  viewerName: string;
  viewerRole: ProfessorWorkspaceRole;
  labs: ProfessorWorkspaceLab[];
  ownedLabCount: number;
  subscriptionMode: ProfessorSubscriptionMode;
  subscriptionPlanKey?: string | null;
  subscriptionStatus?: string | null;
  canManage: boolean;
  managerControls?: ReactNode;
  previewMode?: boolean;
  onPreviewNavigate?: (view: ProfessorPreviewView) => void;
};

function riskBadgeClass(riskLevel: string | null | undefined) {
  if (riskLevel === "high") {
    return "border-red-300/30 bg-red-400/10 text-red-100";
  }

  if (riskLevel === "medium") {
    return "border-amber-300/30 bg-amber-400/10 text-amber-100";
  }

  return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "尚無紀錄";

  return new Date(value).toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PreviewControl({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
    >
      {children}
    </button>
  );
}

export function ProfessorWorkspaceHome({
  viewerName,
  viewerRole,
  labs,
  ownedLabCount,
  subscriptionMode,
  subscriptionPlanKey,
  subscriptionStatus,
  canManage,
  managerControls,
  previewMode = false,
  onPreviewNavigate,
}: ProfessorWorkspaceHomeProps) {
  const isFunctional = subscriptionMode === "functional";
  const hasMemberOnlyAccess = ownedLabCount === 0 && labs.length > 0;
  const planLabel = subscriptionPlanKey === "professor_lab_plus" ? "Plus" : "Standard";
  const statusLabel =
    subscriptionStatus === "trialing"
      ? "30 天試用中"
      : subscriptionStatus === "past_due"
        ? "15 天付款寬限中"
        : "訂閱使用中";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        {previewMode ? (
          <div className="mb-6 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-5 py-3 text-sm leading-6 text-amber-50">
            Admin Preview Mode：此為狀態模擬畫面，所有 Lab、訂閱、邀請碼與學生操作皆已停用。
          </div>
        ) : null}
        <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_36%),rgba(15,23,42,0.86)] p-6 shadow-2xl shadow-blue-950/30">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200">
            Professor Workspace
          </p>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">
                真實教授端 Lab Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                這是正式的多租戶教授端入口，和 Phase 1 隱藏展示頁 /professor 分開。你只能看到自己擁有或以 Professor/assistant 身分加入的 Lab，以及學生主動分享的安全摘要。
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {previewMode ? (
                <>
                  <PreviewControl onClick={() => onPreviewNavigate?.("course")}>觀看 Lab 課程</PreviewControl>
                  <PreviewControl onClick={() => onPreviewNavigate?.("billing")}>管理訂閱</PreviewControl>
                </>
              ) : (
                <>
                  <Link href="/learn" className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-center text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15">觀看 Lab 課程</Link>
                  <Link href="/billing" className="rounded-2xl border border-blue-300/20 bg-blue-400/10 px-4 py-3 text-center text-sm font-semibold text-blue-100 transition hover:bg-blue-400/15">管理訂閱</Link>
                </>
              )}
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
                登入{viewerRole === "admin" ? "管理者" : "教授"}：{viewerName}
              </div>
            </div>
          </div>
        </div>

        <div className={`mt-6 rounded-3xl border p-5 ${isFunctional ? "border-emerald-300/20 bg-emerald-400/10" : "border-amber-300/20 bg-amber-400/10"}`}>
          <p className="text-sm font-semibold text-white">
            {hasMemberOnlyAccess
              ? "你目前以 Professor/assistant 成員身分加入 Lab"
              : isFunctional
                ? `${planLabel} · ${statusLabel}`
                : subscriptionMode === "none"
                  ? "尚未啟用 Professor Lab 試用或訂閱"
                  : "訂閱目前為唯讀狀態"}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {hasMemberOnlyAccess
              ? "你可以查看同 Lab 成員與 consent summary，但不能建立邀請碼、移除成員或管理訂閱。"
              : isFunctional
                ? "可管理 Lab、建立邀請碼並使用 Lab 指定影片。"
                : "既有 Lab 與歷史安全摘要仍可查看；新增成員、Lab 影片與新 PDF 稽核會停用。"}
          </p>
          {ownedLabCount > 0 && !isFunctional ? (
            previewMode ? (
              <span className="mt-3 inline-flex text-sm font-semibold text-cyan-100">查看 Standard／Plus 與 30 天免綁卡試用 →</span>
            ) : (
              <Link href="/pricing" className="mt-3 inline-flex text-sm font-semibold text-cyan-100 hover:text-white">查看 Standard／Plus 與 30 天免綁卡試用 →</Link>
            )
          ) : null}
        </div>

        {canManage && managerControls ? <div className="mt-6">{managerControls}</div> : null}

        <section className="mt-8 space-y-5">
          {labs.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-slate-300">
              目前尚未建立 Lab。請先建立第一個正式 Lab，再產生學生邀請碼。
            </div>
          ) : (
            labs.map((lab) => (
              <article key={lab.id} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">{lab.name}</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {lab.institution ?? "未設定單位"} · 學生 {lab.students.length} 位 · {lab.isOwner ? "Owner" : "Member"}
                    </p>
                  </div>
                  {previewMode ? (
                    <PreviewControl onClick={() => onPreviewNavigate?.("lab")}>查看 Lab 詳情</PreviewControl>
                  ) : (
                    <Link href={`/professor/labs/${lab.id}`} className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20">查看 Lab 詳情</Link>
                  )}
                </div>
                <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.2em] text-slate-400">
                      <tr><th className="px-4 py-3">學生</th><th className="px-4 py-3">學位 / 領域</th><th className="px-4 py-3">最近摘要</th><th className="px-4 py-3">風險</th><th className="px-4 py-3">卡點</th><th className="px-4 py-3">更新</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {lab.students.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-6 text-slate-400">尚無學生加入。請產生邀請碼給學生。</td></tr>
                      ) : (
                        lab.students.map((student) => (
                          <tr key={`${lab.id}:${student.id}`}>
                            <td className="px-4 py-4">
                              {previewMode ? <button type="button" onClick={() => onPreviewNavigate?.("lab")} className="font-semibold text-cyan-100 transition hover:text-cyan-200">{student.name}</button> : <Link href={`/professor/labs/${lab.id}/students/${student.id}`} className="font-semibold text-cyan-100 hover:text-cyan-200">{student.name}</Link>}
                              <p className="mt-1 text-xs text-slate-500">{student.email}</p>
                            </td>
                            <td className="px-4 py-4 text-slate-300">{student.degree ?? "未設定"}<p className="mt-1 text-xs text-slate-500">{student.researchArea ?? "未設定研究領域"}</p></td>
                            <td className="max-w-xs px-4 py-4 text-slate-300">{student.latestSummary?.summary ?? "尚無 AI 稽核摘要"}</td>
                            <td className="px-4 py-4"><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskBadgeClass(student.latestSummary?.riskLevel)}`}>{student.latestSummary?.riskLevel ?? "low"}</span></td>
                            <td className="px-4 py-4"><div className="flex flex-wrap gap-1">{(student.latestSummary?.issueTags ?? ["no_audit_yet"]).map((tag) => <span key={tag} className="rounded-full bg-white/[0.06] px-2 py-1 text-xs text-slate-300">{tag}</span>)}</div></td>
                            <td className="px-4 py-4 text-slate-400">{formatDate(student.latestSummary?.completedAt ?? student.latestSummary?.createdAt ?? student.joinedAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
