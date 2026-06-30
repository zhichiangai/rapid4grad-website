"use client";

import { useState } from "react";
import { StudentDetailDrawer } from "./StudentDetailDrawer";

export type DemoStudent = {
  id: string;
  name: string;
  degreeYear: string;
  researchStage: string;
  risk: "low" | "medium" | "high";
  painPoints: string[];
  lastUpdatedAt: string;
  nextStep: string;
  quizAnswers: Array<{
    question: string;
    answer: string;
  }>;
  meetingNotes: Array<{
    date: string;
    summary: string;
  }>;
  weeklyUpdates: string[];
  nextTasks: string[];
  recommendationDraft: string;
};

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

export function StudentListTable({ students }: { students: DemoStudent[] }) {
  const [selectedStudent, setSelectedStudent] = useState<DemoStudent | null>(
    null,
  );
  const [recommendationStudent, setRecommendationStudent] =
    useState<DemoStudent | null>(null);

  return (
    <>
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 shadow-2xl shadow-blue-950/20">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-5 py-4">學生</th>
                <th className="px-5 py-4">學位年級</th>
                <th className="px-5 py-4">研究階段</th>
                <th className="px-5 py-4">風險</th>
                <th className="px-5 py-4">主要卡點</th>
                <th className="px-5 py-4">最近更新</th>
                <th className="px-5 py-4">下一步</th>
                <th className="px-5 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {students.map((student) => (
                <tr key={student.id} className="align-top">
                  <td className="px-5 py-4 font-semibold text-white">
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(student)}
                      className="text-left underline-offset-4 hover:text-blue-200 hover:underline"
                    >
                      {student.name}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    {student.degreeYear}
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    {student.researchStage}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskClass[student.risk]}`}
                    >
                      {riskLabel[student.risk]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {student.painPoints.map((point) => (
                        <span
                          key={point}
                          className="rounded-full border border-blue-300/20 bg-blue-500/10 px-2 py-1 text-xs text-blue-100"
                        >
                          {point}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-400">
                    {student.lastUpdatedAt}
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    {student.nextStep}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedStudent(student)}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/[0.08]"
                      >
                        詳情
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecommendationStudent(student)}
                        className="rounded-xl bg-blue-500 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400"
                      >
                        生成推薦信
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <StudentDetailDrawer
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />

      {recommendationStudent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur">
          <button
            type="button"
            aria-label="關閉推薦信草稿"
            className="absolute inset-0 cursor-default"
            onClick={() => setRecommendationStudent(null)}
          />
          <div className="relative max-h-[86vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-blue-950/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-blue-300">
                  Frontend Draft Only
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  {recommendationStudent.name} 推薦信草稿
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  此 demo 不呼叫 AI API，僅展示未來教授端價值。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRecommendationStudent(null)}
                className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
              >
                關閉
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-8 text-slate-200">
              <p>Dear Admissions Committee,</p>
              <p className="mt-4">
                {recommendationStudent.recommendationDraft}
              </p>
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
    </>
  );
}
