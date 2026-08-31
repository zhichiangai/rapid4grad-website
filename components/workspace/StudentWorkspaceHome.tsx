"use client";

import Link from "next/link";
import { FormEvent } from "react";
import { formatTaipeiMeetingDateTime } from "@/lib/meetings/meeting-time";

export type StudentRiskLevel = "low" | "medium" | "high";

export type StudentLeadSummary = {
  quiz_result: StudentRiskLevel | null;
  quiz_score: number | null;
  main_tags: string[] | null;
};

export type StudentWorkspaceHomeProps = {
  leadSummary: StudentLeadSummary | null;
  isLoading?: boolean;
  advisorStyle: string;
  frequentQuestions: string;
  onAdvisorStyleChange: (value: string) => void;
  onFrequentQuestionsChange: (value: string) => void;
  onSubmitAdvisorMemory: (event: FormEvent<HTMLFormElement>) => void;
  isSaving?: boolean;
  message?: string;
  previewMode?: boolean;
  accessSummary?: {
    course: string;
    audit: string;
    lab: string;
  };
  weeklyCheckIn?: {
    updatedAt: string | null;
  };
  meetingSummary?: {
    pendingCount: number;
    nextMeetingAt: string | null;
  };
  actionSummary?: {
    overdueCount: number;
    dueSoonCount: number;
    openCount: number;
  };
  thesisSummary?: {
    currentLabel: string;
    completedCount: number;
    blocked: boolean;
  };
};

const riskCopy: Record<
  StudentRiskLevel,
  { label: string; className: string; description: string }
> = {
  low: {
    label: "低風險",
    className: "border-emerald-300/30 bg-emerald-500/10 text-emerald-100",
    description: "目前狀態相對穩定，建議維持每週輸出與 Meeting 前提問預演。",
  },
  medium: {
    label: "中風險",
    className: "border-amber-300/30 bg-amber-500/10 text-amber-100",
    description: "已有幾個卡點開始影響節奏，建議本週先處理最直接影響 Meeting 的問題。",
  },
  high: {
    label: "高風險",
    className: "border-red-300/30 bg-red-500/10 text-red-100",
    description: "目前研究節奏可能已經失控，建議先縮小任務並建立下次 Meeting 的問題清單。",
  },
};

const tagLabels: Record<string, string> = {
  tag_literature_blocked: "文獻閱讀卡關",
  tag_advisor_meeting_blocked: "Meeting 壓力",
  tag_presentation_blocked: "簡報失焦",
  tag_tooling_blocked: "工具落差",
  tag_high_stress: "高焦慮",
};

export function StudentWorkspaceHome({
  leadSummary,
  isLoading = false,
  advisorStyle,
  frequentQuestions,
  onAdvisorStyleChange,
  onFrequentQuestionsChange,
  onSubmitAdvisorMemory,
  isSaving = false,
  message = "",
  previewMode = false,
  accessSummary,
  weeklyCheckIn,
  meetingSummary,
  actionSummary,
  thesisSummary,
}: StudentWorkspaceHomeProps) {
  const riskInfo = leadSummary?.quiz_result
    ? riskCopy[leadSummary.quiz_result]
    : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.20),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-12 text-white">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        {previewMode ? (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-5 py-3 text-sm leading-6 text-amber-50">
            Admin Preview Mode：此為固定情境資料，儲存、付款、上傳與其他操作均不會執行。
          </div>
        ) : null}
        <header className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-7 shadow-2xl shadow-blue-950/30 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">RAPID4GRAD DASHBOARD</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">研究工作台</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            這裡整合畢業風險摘要、指導教授長期記憶庫與核心工具入口。第一版以手動記錄與 AI 指令產生器為主。
          </p>
        </header>

        {accessSummary ? (
          <section className="grid gap-3 md:grid-cols-3">
            {[
              ["課程權限", accessSummary.course],
              ["Lab 狀態", accessSummary.lab],
              ["PDF AI 稽核", accessSummary.audit],
            ].map(([label, value]) => (
              <div key={label} className="rounded-3xl border border-cyan-300/15 bg-cyan-400/[0.06] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">{label}</p>
                <p className="mt-3 text-sm font-semibold leading-6 text-white">{value}</p>
              </div>
            ))}
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Latest Quiz Result</p>
                <h2 className="mt-3 text-2xl font-semibold">最近一次畢業狀態檢查</h2>
              </div>
              {riskInfo ? <span className={`rounded-full border px-4 py-2 text-sm font-semibold ${riskInfo.className}`}>{riskInfo.label}</span> : null}
            </div>
            {isLoading ? (
              <p className="mt-5 text-sm text-slate-400">讀取中...</p>
            ) : riskInfo ? (
              <div className="mt-5">
                <p className="text-sm leading-6 text-slate-300">{riskInfo.description}</p>
                <p className="mt-4 text-sm text-slate-400">風險分數：{leadSummary?.quiz_score ?? "-"}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {(leadSummary?.main_tags ?? []).map((tag) => <span key={tag} className="rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-100">{tagLabels[tag] ?? tag}</span>)}
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <p className="text-sm leading-6 text-slate-400">目前還沒有畢業狀態檢查結果。先完成 7 題檢查，Dashboard 就會顯示你的風險摘要與主要卡點。</p>
                {previewMode ? <button type="button" disabled className="mt-5 rounded-2xl bg-blue-500/60 px-5 py-3 text-sm font-semibold text-white">開始 7 題檢查</button> : <Link href="/quiz" className="mt-5 inline-flex rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400">開始 7 題檢查</Link>}
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Core Tools</p>
            <h2 className="mt-3 text-2xl font-semibold">下一步工具</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["每週研究進度", weeklyCheckIn?.updatedAt ? "✓ 本週已更新" : "本週尚未更新", "/dashboard/weekly-check-in"],
                ["研究 Meeting", meetingSummary?.nextMeetingAt ? `下一場：${formatTaipeiMeetingDateTime(meetingSummary.nextMeetingAt)}` : meetingSummary?.pendingCount ? `有 ${meetingSummary.pendingCount} 場待補紀錄` : "目前尚未安排 Meeting。", "/dashboard/meetings"],
                ["AI 指令產生器", "Meeting 前先產生教授追問與邏輯檢查指令。", "/dashboard/ai-command"],
                ["課程觀看頁", "依 RAPID 五大模組整理研究流程。", "/dashboard/course"],
              ].map(([title, description, href]) => previewMode ? (
                <div key={title} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 opacity-80"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p></div>
              ) : (
                <Link key={title} href={href} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-blue-300/30 hover:bg-blue-500/10"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{title === "每週研究進度" ? <><span className="block">{description}</span><span className="mt-3 inline-flex rounded-xl bg-blue-500/15 px-3 py-2 text-xs font-semibold text-blue-100">{weeklyCheckIn?.updatedAt ? "查看 / 更新本週進度" : "填寫本週進度"}</span></> : description}</p></Link>
              ))}
            </div>
            {!previewMode ? <Link href="/dashboard/thesis" className="mt-3 block rounded-2xl border border-blue-300/15 bg-blue-400/[0.04] p-4 transition hover:border-blue-300/35 hover:bg-blue-400/10"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-white">論文進度</p><p className="mt-1 text-sm text-slate-400">{thesisSummary?.blocked ? `目前卡在：${thesisSummary.currentLabel}` : thesisSummary ? `目前：${thesisSummary.currentLabel} · 完成 ${thesisSummary.completedCount} / 8` : "查看 8 個論文里程碑"}</p></div><span className="rounded-xl bg-blue-400/10 px-3 py-2 text-xs font-semibold text-blue-100">查看論文進度</span></div></Link> : null}
            {!previewMode ? <Link href="/dashboard/actions" className="mt-3 block rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.04] p-4 transition hover:border-cyan-300/35 hover:bg-cyan-400/10"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-white">我的下一步</p><p className="mt-1 text-sm text-slate-400">{actionSummary?.overdueCount ? `${actionSummary.overdueCount} 項已逾期` : actionSummary?.dueSoonCount ? `未來 14 天 ${actionSummary.dueSoonCount} 項` : actionSummary?.openCount ? `${actionSummary.openCount} 項待處理` : "目前沒有待處理 Action"}</p></div><span className="rounded-xl bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100">查看下一步</span></div></Link> : null}
          </div>
        </section>

        <form onSubmit={onSubmitAdvisorMemory} className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-7 shadow-2xl shadow-blue-950/20">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">Advisor Memory</p>
          <h2 className="mt-3 text-2xl font-semibold">指導教授長期記憶庫設定</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Phase 1 先用手動筆記記錄教授偏好。未來產生 AI 指令時，這些內容會成為你模擬教授追問的重要素材。</p>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <label className="block"><span className="text-sm font-medium text-slate-200">教授偏好風格</span><textarea value={advisorStyle} onChange={(event) => onAdvisorStyleChange(event.target.value)} rows={7} disabled={previewMode} className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/50 disabled:cursor-not-allowed disabled:opacity-60" placeholder="例如：重視前後邏輯、常問對照組、希望報告先講結論、很在意圖表是否支撐主張..." /></label>
            <label className="block"><span className="text-sm font-medium text-slate-200">常問問題（一行一題）</span><textarea value={frequentQuestions} onChange={(event) => onFrequentQuestionsChange(event.target.value)} rows={7} disabled={previewMode} className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/50 disabled:cursor-not-allowed disabled:opacity-60" placeholder={"你的 control group 是什麼？\n這個指標怎麼定義？\n跟前人研究差在哪？"} /></label>
          </div>
          <button type="submit" disabled={isSaving || previewMode} className="mt-6 rounded-2xl bg-blue-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60">{previewMode ? "Preview 中不可儲存" : isSaving ? "儲存中..." : "儲存教授記憶庫"}</button>
          {message ? <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-slate-300">{message}</p> : null}
        </form>
      </section>
    </main>
  );
}
