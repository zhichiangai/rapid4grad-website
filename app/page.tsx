import Link from "next/link";

const painScenes = [
  {
    title: "文獻閱讀卡關",
    label: "Literature",
    body: "讀了很多篇 paper，卻說不清研究動機、方法差異與自己的 gap 到底在哪裡。",
  },
  {
    title: "題目不穩",
    label: "Research Gap",
    body: "題目看似有方向，但一被問到貢獻、變因、對照組或可行性，就開始動搖。",
  },
  {
    title: "Meeting 壓力",
    label: "Advisor Meeting",
    body: "每次見教授前都不知道會被問什麼，報告後才發現真正該準備的問題沒準備。",
  },
  {
    title: "簡報失焦",
    label: "Presentation",
    body: "投影片塞滿文字，故事線不清楚，台下聽不出研究價值，還容易被排版與錯字打斷。",
  },
  {
    title: "工具落差",
    label: "AI Workflow",
    body: "知道 AI 可以幫忙，卻只會丟大白話問題，沒有把教授偏好與研究情境轉成精準指令。",
  },
];

const steps = [
  "選擇你的研究階段",
  "指定 Meeting 或報告情境",
  "勾選目前最卡的痛點",
  "產生可貼到外部 AI 的學術指令",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.28),transparent_34rem),radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.16),transparent_28rem),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur">
          <Link href="/" className="text-sm font-semibold tracking-[0.2em]">
            RAPID4GRAD
          </Link>
          <div className="hidden items-center gap-5 text-sm text-slate-300 sm:flex">
            <Link href="/guide" className="transition hover:text-white">
              避坑指南
            </Link>
            <Link href="/course" className="transition hover:text-white">
              課程方案
            </Link>
            <Link href="/login" className="transition hover:text-white">
              登入
            </Link>
          </div>
        </nav>

        <div className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="inline-flex rounded-full border border-blue-300/20 bg-blue-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-blue-200">
              Academic AI Command Builder
            </p>
            <h1 className="mt-7 max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Meeting 前，先知道教授會怎麼問
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              不用先上傳檔案，只要選擇研究階段、Meeting 情境與卡關痛點，RAPID
              就幫你產生可貼到 ChatGPT / Claude / Gemini / Grok 的學術 AI
              指令，讓你在見教授前先完成一次高壓預演。
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/quiz"
                className="inline-flex items-center justify-center rounded-2xl bg-blue-500 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400"
              >
                先做 7 題畢業狀態檢查
              </Link>
              <Link
                href="/guide"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
              >
                閱讀畢業避坑指南
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-4">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <p className="text-xs font-semibold text-cyan-200">
                    0{index + 1}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[3rem] bg-blue-500/15 blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-slate-950/85 p-6 shadow-2xl shadow-blue-950/30 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">
                Prompt Preview
              </p>
              <div className="mt-5 rounded-3xl border border-white/10 bg-black/30 p-5 font-mono text-sm leading-7 text-slate-300">
                <p className="text-blue-200">## Role</p>
                <p>
                  You are a rigorous academic advisor simulating a thesis
                  meeting.
                </p>
                <p className="mt-4 text-blue-200">## Context</p>
                <p>
                  Student: master graduate student. Meeting: advisor one-on-one.
                  Pain points: research gap, logic check, presentation focus.
                </p>
                <p className="mt-4 text-blue-200">## Task</p>
                <p>
                  Ask the 10 questions most likely to expose weak assumptions
                  before the real meeting.
                </p>
              </div>
              <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-4 text-sm leading-6 text-cyan-100">
                你不是把論文交給 RAPID，而是拿到一組更會問問題的 AI
                指令，再自行貼到外部 AI 分析。
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">
              Graduate Pain Map
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              五大研究生高風險卡點
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">
            這些不是抽象焦慮，而是會直接影響 Meeting 品質、論文進度與畢業節奏的具體場景。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {painScenes.map((scene) => (
            <article
              key={scene.title}
              className="group rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-5 transition hover:-translate-y-1 hover:border-blue-300/30 hover:bg-blue-500/[0.06]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                {scene.label}
              </p>
              <h3 className="mt-4 text-xl font-semibold text-white">
                {scene.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {scene.body}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
