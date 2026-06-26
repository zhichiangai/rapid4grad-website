"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type RiskLevel = "low" | "medium" | "high";

interface RiskContent {
  label: string;
  badgeClassName: string;
  meterClassName: string;
  meterValue: number;
  title: string;
  description: string;
}

const RISK_CONTENT: Record<RiskLevel, RiskContent> = {
  low: {
    label: "低風險",
    badgeClassName: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200",
    meterClassName: "bg-emerald-400",
    meterValue: 32,
    title: "目前狀態相對穩定",
    description:
      "你的研究節奏大致在掌控中。接下來的重點不是製造焦慮，而是把好習慣固定下來，避免後期被文獻、Meeting 或簡報壓力突然追上。",
  },
  medium: {
    label: "中風險",
    badgeClassName: "border-amber-300/30 bg-amber-400/10 text-amber-200",
    meterClassName: "bg-amber-400",
    meterValue: 62,
    title: "已出現幾個需要處理的卡點",
    description:
      "你目前不是沒有機會，而是需要更明確的優先順序。建議先挑一個最影響畢業進度的問題處理，不要同時把文獻、實驗、簡報與焦慮全部扛在身上。",
  },
  high: {
    label: "高風險",
    badgeClassName: "border-rose-300/30 bg-rose-400/10 text-rose-200",
    meterClassName: "bg-rose-400",
    meterValue: 86,
    title: "目前需要先穩住研究節奏",
    description:
      "你的狀態可能已經影響 Meeting 品質、研究推進或日常作息。這不是要恐嚇你，而是提醒你先把問題拆小，從本週能完成的三個動作開始恢復控制感。",
  },
};

const TAG_LABELS: Record<string, string> = {
  tag_literature_blocked: "文獻閱讀卡關",
  tag_advisor_meeting_blocked: "教授 Meeting 壓力",
  tag_presentation_blocked: "簡報表達卡關",
  tag_tooling_blocked: "工具與 AI 使用落差",
  tag_high_stress: "壓力與作息失衡",
};

const TAG_STYLES: Record<string, string> = {
  tag_literature_blocked: "border-sky-300/25 bg-sky-400/10 text-sky-100",
  tag_advisor_meeting_blocked:
    "border-blue-300/25 bg-blue-400/10 text-blue-100",
  tag_presentation_blocked:
    "border-violet-300/25 bg-violet-400/10 text-violet-100",
  tag_tooling_blocked:
    "border-cyan-300/25 bg-cyan-400/10 text-cyan-100",
  tag_high_stress: "border-rose-300/25 bg-rose-400/10 text-rose-100",
};

const TAG_ACTIONS: Record<string, string> = {
  tag_literature_blocked:
    "選一篇最核心的英文文獻，用 5 句話寫下研究動機、方法、結果、限制與你題目的關聯。",
  tag_advisor_meeting_blocked:
    "下一次 Meeting 前先準備 3 個問題：目前進度、卡住原因、你希望教授判斷的選項。",
  tag_presentation_blocked:
    "把下一份簡報壓成 1 條主線：研究問題、方法、目前結果、下一步，不要先追求頁數完整。",
  tag_tooling_blocked:
    "本週先整理一個 Zotero / EndNote 文獻庫，並把 5 篇核心文獻的 citation 補齊。",
  tag_high_stress:
    "先排出一個 90 分鐘不被打斷的研究時段，只處理一個最小任務，避免用熬夜補進度。",
};

function normalizeRisk(value: string | null): RiskLevel {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  return "medium";
}

function normalizeScore(value: string | null) {
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 ? score : null;
}

function parseTags(value: string | null) {
  if (!value) return [];

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function getActionPlan(risk: RiskLevel, tags: string[]) {
  const tagActions = tags
    .map((tag) => TAG_ACTIONS[tag])
    .filter((action): action is string => Boolean(action));

  const defaultActions: Record<RiskLevel, string[]> = {
    low: [
      "固定每週一次研究回顧，記錄本週完成、下週要驗證、需要問教授的問題。",
      "把目前題目用一句話寫清楚，確認自己知道研究問題與貢獻在哪裡。",
      "挑一個小工具流程優化，例如文獻管理、AI 指令或簡報模板，降低後期摩擦。",
    ],
    medium: [
      "列出目前最拖慢進度的 3 個卡點，只選其中 1 個作為本週優先處理項。",
      "把下次 Meeting 要問教授的問題提前寫好，避免只帶模糊焦慮進會議。",
      "安排一次 45 分鐘文獻或簡報整理，產出一份可以被檢查的具體材料。",
    ],
    high: [
      "先停止同時處理所有問題，選一個最小可完成任務，今天就完成一版草稿。",
      "下一次找教授前，先寫下你已做了什麼、卡在哪裡、希望教授幫你判斷什麼。",
      "若壓力已明顯影響睡眠或生活，請優先找可信任的人或校內資源討論，不要獨自硬撐。",
    ],
  };

  return [...tagActions, ...defaultActions[risk]].slice(0, 3);
}

function ResultContent() {
  const searchParams = useSearchParams();
  const risk = normalizeRisk(searchParams.get("risk"));
  const score = normalizeScore(searchParams.get("score"));
  const tags = parseTags(searchParams.get("tags"));
  const riskContent = RISK_CONTENT[risk];
  const actions = getActionPlan(risk, tags);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.20),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-10 text-white">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-6 shadow-2xl shadow-blue-950/20 backdrop-blur sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">
                RAPID4GRAD RESULT
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                你的研究生畢業狀態檢查結果
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-400">
                這份結果不是最終判決，而是協助你看見目前最該處理的研究卡點，並把下一步拆成可以執行的行動。
              </p>
            </div>

            <span
              className={`w-fit rounded-full border px-4 py-2 text-sm font-semibold ${riskContent.badgeClassName}`}
            >
              {riskContent.label}
            </span>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">
                    {riskContent.title}
                  </h2>
                  {score !== null ? (
                    <p className="mt-2 text-sm text-slate-400">
                      規則引擎分數：{score} 分
                    </p>
                  ) : null}
                </div>
                <span className="font-mono text-3xl font-semibold text-white">
                  {riskContent.meterValue}
                  <span className="text-base text-slate-500">%</span>
                </span>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full shadow-[0_0_20px_rgba(255,255,255,0.22)] transition-all duration-500 ${riskContent.meterClassName}`}
                  style={{ width: `${riskContent.meterValue}%` }}
                />
              </div>

              <p className="mt-5 text-sm leading-7 text-slate-300">
                {riskContent.description}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-lg font-semibold text-white">主要卡點</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                這些標籤會用來安排後續指南與 Email 內容順序。
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <span
                      key={tag}
                      className={`rounded-full border px-3 py-2 text-sm font-medium ${
                        TAG_STYLES[tag] ??
                        "border-white/10 bg-white/[0.06] text-slate-200"
                      }`}
                    >
                      {TAG_LABELS[tag] ?? tag}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-100">
                    目前沒有明顯單一卡點
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-6 shadow-2xl shadow-blue-950/20 backdrop-blur sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">
                THIS WEEK
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                本週三個行動建議
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-400">
              先做得出來，比一次規劃完美更重要。這三件事的目標是幫你恢復研究節奏。
            </p>
          </div>

          <ol className="mt-6 grid gap-4">
            {actions.map((action, index) => (
              <li
                key={action}
                className="flex gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/15 font-mono text-sm font-semibold text-blue-200">
                  {index + 1}
                </span>
                <p className="text-sm leading-7 text-slate-200">{action}</p>
              </li>
            ))}
          </ol>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/guide"
              className="inline-flex items-center justify-center rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400"
            >
              前往免費指南
            </Link>
            <Link
              href="/course"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
            >
              了解 RAPID 課程方案
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-white">
          <div className="rounded-3xl border border-white/10 bg-slate-950/80 px-6 py-5 text-sm text-slate-300 shadow-2xl shadow-blue-950/20">
            正在整理你的檢查結果...
          </div>
        </main>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
