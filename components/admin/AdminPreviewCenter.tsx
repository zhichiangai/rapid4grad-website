"use client";

import { useState } from "react";

type PreviewWorkspace = "student" | "professor";
type StudentScenario = "no_access" | "lab_member" | "full_course";
type ProfessorScenario = "trial" | "standard" | "readonly";

const studentScenarios: Record<
  StudentScenario,
  { label: string; description: string; course: string; audit: string }
> = {
  no_access: {
    label: "未購買／未加入 Lab",
    description: "顯示個人研究工具與課程方案入口。",
    course: "完整課程尚未解鎖",
    audit: "PDF AI 稽核需先加入有效訂閱 Lab",
  },
  lab_member: {
    label: "有效 Lab 學生",
    description: "可觀看 Lab 基礎影片，並使用 Lab 共用 PDF 額度。",
    course: "可觀看 Lab 指定影片",
    audit: "可使用 Lab shared pool：本月剩餘 18 次",
  },
  full_course: {
    label: "已買斷完整課程",
    description: "完整課程永久解鎖；PDF AI 仍取決於 Lab 訂閱。",
    course: "完整課程永久解鎖",
    audit: "未加入有效 Lab 時不可使用 PDF AI 稽核",
  },
};

const professorScenarios: Record<
  ProfessorScenario,
  { label: string; description: string; plan: string; action: string }
> = {
  trial: {
    label: "30 天免綁卡試用",
    description: "可建立 Lab、邀請學生並使用完整 Professor 管理功能。",
    plan: "Standard 試用中 · 剩餘 22 天 · 6 / 15 位學生",
    action: "可建立邀請碼與管理成員",
  },
  standard: {
    label: "Standard 訂閱中",
    description: "正式團隊管理狀態，學生數達 15 位前可維持 Standard。",
    plan: "Standard 月繳 · 14 / 15 位學生",
    action: "第 16 位學生加入前須升級 Plus",
  },
  readonly: {
    label: "訂閱失效後唯讀",
    description: "保留 Lab 與歷史摘要檢視，但停用新增與變更操作。",
    plan: "付款寬限結束 · 唯讀模式",
    action: "不可建立邀請碼、加入成員或建立新 PDF 稽核",
  },
};

function ScenarioButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
        active
          ? "border-cyan-200/50 bg-cyan-300/15 text-cyan-50"
          : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
      }`}
    >
      {label}
    </button>
  );
}

export function AdminPreviewCenter() {
  const [workspace, setWorkspace] = useState<PreviewWorkspace>("student");
  const [studentScenario, setStudentScenario] =
    useState<StudentScenario>("lab_member");
  const [professorScenario, setProfessorScenario] =
    useState<ProfessorScenario>("trial");

  const student = studentScenarios[studentScenario];
  const professor = professorScenarios[professorScenario];
  const professorReadonly = professorScenario === "readonly";

  return (
    <section className="space-y-5">
      <header className="rounded-[2rem] border border-cyan-300/20 bg-cyan-400/[0.07] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
          Read-only Interface Preview
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          學生與教授介面預覽中心
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          此頁僅使用固定 Demo 資料呈現權限狀態與介面結構，不會讀取其他真實使用者資料，亦不會建立訂單、Lab、邀請碼、PDF 或任何操作紀錄。
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="預覽工作介面">
        <ScenarioButton
          active={workspace === "student"}
          label="學生工作台"
          onClick={() => setWorkspace("student")}
        />
        <ScenarioButton
          active={workspace === "professor"}
          label="教授 Lab Dashboard"
          onClick={() => setWorkspace("professor")}
        />
      </div>

      {workspace === "student" ? (
        <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
          <aside className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              學生情境
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {(Object.keys(studentScenarios) as StudentScenario[]).map((key) => (
                <ScenarioButton
                  key={key}
                  active={studentScenario === key}
                  label={studentScenarios[key].label}
                  onClick={() => setStudentScenario(key)}
                />
              ))}
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-500">
              用於驗收課程與 Lab 衍生權限的顯示邏輯，不代表實際登入者。
            </p>
          </aside>

          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl shadow-blue-950/20">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.035] px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">
                  RAPID4GRAD Dashboard Preview
                </p>
                <h3 className="mt-1 text-xl font-semibold text-white">研究工作台</h3>
              </div>
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
                Demo mode
              </span>
            </div>
            <div className="grid gap-4 p-5 lg:grid-cols-3">
              <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 lg:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                  本週研究狀態
                </p>
                <h4 className="mt-3 text-2xl font-semibold text-white">Meeting 前提問準備</h4>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  本週先整理研究缺口、實驗邏輯與教授可能追問的三項問題。
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {['文獻缺口', 'Meeting 準備', '簡報結構'].map((tag) => (
                    <span key={tag} className="rounded-full bg-blue-400/10 px-3 py-1 text-xs text-blue-100">
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
              <article className="rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.07] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">課程權限</p>
                <p className="mt-3 text-lg font-semibold text-white">{student.course}</p>
                <button type="button" disabled className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-slate-400">
                  Preview 中不可播放
                </button>
              </article>
              <article className="rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.06] p-5 lg:col-span-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">PDF AI 稽核</p>
                <p className="mt-3 text-lg font-semibold text-white">{student.audit}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{student.description}</p>
              </article>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
          <aside className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              教授情境
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {(Object.keys(professorScenarios) as ProfessorScenario[]).map((key) => (
                <ScenarioButton
                  key={key}
                  active={professorScenario === key}
                  label={professorScenarios[key].label}
                  onClick={() => setProfessorScenario(key)}
                />
              ))}
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-500">
              使用虛構 Lab 與學生摘要。真實 Lab 的唯讀檢查請使用 Admin 的 Lab 營運觀察。
            </p>
          </aside>

          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl shadow-blue-950/20">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.035] px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                  Professor Workspace Preview
                </p>
                <h3 className="mt-1 text-xl font-semibold text-white">真實教授端 Lab Dashboard</h3>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${professorReadonly ? "border-slate-400/30 bg-slate-400/10 text-slate-200" : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"}`}>
                {professorReadonly ? "Read-only" : "Functional"}
              </span>
            </div>
            <div className="p-5">
              <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Demo Lab</p>
                    <h4 className="mt-2 text-2xl font-semibold text-white">智慧製造研究室</h4>
                    <p className="mt-2 text-sm text-slate-400">臺灣科技大學 · 12 位學生 · 2 位 assistants</p>
                  </div>
                  <button type="button" disabled className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60">
                    產生學生邀請碼
                  </button>
                </div>
                <div className="mt-5 rounded-2xl border border-blue-300/20 bg-blue-300/[0.07] p-4">
                  <p className="text-sm font-semibold text-white">{professor.plan}</p>
                  <p className="mt-2 text-sm text-slate-300">{professor.action}</p>
                </div>
              </article>
              <div className="mt-5 overflow-hidden rounded-3xl border border-white/10">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-400">
                    <tr><th className="px-4 py-3">學生</th><th className="px-4 py-3">最新安全摘要</th><th className="px-4 py-3">風險</th><th className="px-4 py-3">狀態</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-slate-300">
                    {[
                      ["林同學", "文獻缺口與方法選擇仍待聚焦", "medium"],
                      ["王同學", "實驗結果邏輯已完成第一輪修正", "low"],
                      ["陳同學", "口試前簡報需要重新安排論證順序", "high"],
                    ].map(([name, summary, risk]) => (
                      <tr key={name}>
                        <td className="px-4 py-4 font-semibold text-white">{name}</td>
                        <td className="max-w-sm px-4 py-4">{summary}</td>
                        <td className="px-4 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${risk === "high" ? "bg-red-400/15 text-red-100" : risk === "medium" ? "bg-amber-300/15 text-amber-100" : "bg-emerald-300/15 text-emerald-100"}`}>{risk}</span></td>
                        <td className="px-4 py-4 text-slate-400">僅 consent summary</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
