"use client";

import { useState } from "react";

type DemoStudent = {
  id: string;
  name: string;
  degree: string;
  risk: "low" | "medium" | "high";
  blocker: string;
  progress: string;
  recommendation: string;
};

const students: DemoStudent[] = [
  {
    id: "s1",
    name: "碩二小明",
    degree: "M2",
    risk: "high",
    blocker: "簡報卡關、研究價值表達不清",
    progress: "完成初步實驗，但組會簡報常被打斷。",
    recommendation:
      "It is my pleasure to recommend Ming, a graduate student who has demonstrated persistence in refining his research presentation and strengthening the logical framing of his thesis work. His recent progress shows a clear ability to respond to feedback, identify weaknesses in communication, and translate experimental results into a more coherent research narrative.",
  },
  {
    id: "s2",
    name: "碩一小華",
    degree: "M1",
    risk: "low",
    blocker: "正常推進、文獻整理穩定",
    progress: "每週固定整理文獻，能清楚描述研究問題。",
    recommendation:
      "Hua is a promising first-year graduate student with strong discipline in literature review and research organization. She consistently prepares for meetings with clear questions and demonstrates maturity in connecting prior work to possible research directions.",
  },
  {
    id: "s3",
    name: "博三怡君",
    degree: "PhD",
    risk: "medium",
    blocker: "投稿前邏輯漏洞檢查",
    progress: "已有完整 manuscript draft，需要加強 limitation 與 contribution framing。",
    recommendation:
      "Yi-Chun has shown strong independence in developing a publishable research manuscript. Her work reflects careful methodological execution, and with further refinement of contribution framing, she is well-positioned to make a meaningful scholarly contribution.",
  },
  {
    id: "s4",
    name: "碩三阿哲",
    degree: "M3+",
    risk: "high",
    blocker: "題目不穩、Meeting 壓力高",
    progress: "研究方向多次調整，目前缺少明確畢業路線。",
    recommendation:
      "Che has demonstrated resilience through several research direction changes and continues to engage seriously with advisor feedback. His ability to persist under uncertainty and gradually narrow his research scope reflects qualities valuable in challenging academic environments.",
  },
  {
    id: "s5",
    name: "在職專班小安",
    degree: "Part-time",
    risk: "medium",
    blocker: "時間分配與工具落差",
    progress: "研究動機明確，但需要建立穩定工具流與每週產出節奏。",
    recommendation:
      "An brings valuable professional experience into graduate research and has shown the ability to connect practical problems with academic inquiry. With improved workflow management, An has strong potential to complete a focused and impactful thesis project.",
  },
];

const riskClass = {
  low: "border-emerald-300/30 bg-emerald-500/10 text-emerald-100",
  medium: "border-amber-300/30 bg-amber-500/10 text-amber-100",
  high: "border-red-300/30 bg-red-500/10 text-red-100",
};

const riskLabel = {
  low: "低風險",
  medium: "中風險",
  high: "高風險",
};

export default function ProfessorDemoPage() {
  const [selectedStudent, setSelectedStudent] = useState<DemoStudent | null>(
    null,
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.24),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-10 text-white">
      <section className="mx-auto w-full max-w-7xl">
        <header className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-7 shadow-2xl shadow-blue-950/30">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">
            Hidden Professor Demo
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            實驗室健康度看板
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
            這是隱藏入口的 Professor Dashboard demo，用於展示未來 Research
            Progress Management System 的商業價值：教授可以快速看到學生風險、卡點與推薦信草稿。
          </p>
        </header>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["學生數", students.length.toString()],
            ["高風險", students.filter((student) => student.risk === "high").length.toString()],
            ["本週需關注", "Meeting / 簡報 / 投稿"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
            >
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                {label}
              </p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 shadow-2xl shadow-blue-950/20">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-5 py-4">學生</th>
                <th className="px-5 py-4">學位</th>
                <th className="px-5 py-4">卡點</th>
                <th className="px-5 py-4">進度摘要</th>
                <th className="px-5 py-4">風險</th>
                <th className="px-5 py-4">推薦信</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="px-5 py-4 font-semibold text-white">
                    {student.name}
                  </td>
                  <td className="px-5 py-4 text-slate-300">{student.degree}</td>
                  <td className="px-5 py-4 text-slate-300">{student.blocker}</td>
                  <td className="px-5 py-4 text-slate-400">
                    {student.progress}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskClass[student.risk]}`}
                    >
                      {riskLabel[student.risk]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(student)}
                      className="rounded-xl bg-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400"
                    >
                      生成推薦信
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>

      {selectedStudent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur">
          <div className="max-h-[86vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-blue-950/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-blue-300">
                  AI Recommendation Draft
                </p>
                <h2 className="mt-3 text-2xl font-semibold">
                  {selectedStudent.name} 推薦信草稿
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
              >
                關閉
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-8 text-slate-200">
              <p>Dear Admissions Committee,</p>
              <p className="mt-4">{selectedStudent.recommendation}</p>
              <p className="mt-4">
                Based on the student&apos;s weekly progress, research blockers,
                and advisor meeting history, I believe this student has
                developed the analytical discipline and academic persistence
                necessary for advanced research training.
              </p>
              <p className="mt-4">Sincerely,</p>
              <p>Professor Demo</p>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
