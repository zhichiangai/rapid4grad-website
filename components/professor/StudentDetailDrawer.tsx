"use client";

import type { DemoStudent } from "./StudentListTable";

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

export function StudentDetailDrawer({
  student,
  onClose,
}: {
  student: DemoStudent | null;
  onClose: () => void;
}) {
  if (!student) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/75 backdrop-blur">
      <button
        type="button"
        aria-label="關閉學生詳情"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <aside className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-slate-950 p-6 shadow-2xl shadow-blue-950/40">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">
              Student Detail
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              {student.name}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {student.degreeYear} · {student.researchStage}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            關閉
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskClass[student.risk]}`}
          >
            {riskLabel[student.risk]}
          </span>
          {student.painPoints.map((point) => (
            <span
              key={point}
              className="rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-100"
            >
              {point}
            </span>
          ))}
        </div>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <h3 className="text-lg font-semibold text-white">7 題答案摘要</h3>
          <div className="mt-4 grid gap-3">
            {student.quizAnswers.map((answer) => (
              <div
                key={answer.question}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {answer.question}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  {answer.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <h3 className="text-lg font-semibold text-white">Meeting 紀錄</h3>
          <div className="mt-4 space-y-3">
            {student.meetingNotes.map((note) => (
              <div
                key={`${note.date}-${note.summary}`}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
              >
                <p className="text-xs text-blue-200">{note.date}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {note.summary}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <h3 className="text-lg font-semibold text-white">每週更新</h3>
          <ul className="mt-4 space-y-3">
            {student.weeklyUpdates.map((update) => (
              <li
                key={update}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300"
              >
                {update}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-5 rounded-3xl border border-cyan-300/20 bg-cyan-500/10 p-5">
          <h3 className="text-lg font-semibold text-cyan-50">下一步任務</h3>
          <ul className="mt-4 space-y-3">
            {student.nextTasks.map((task) => (
              <li key={task} className="flex gap-3 text-sm leading-6 text-cyan-50">
                <span className="mt-2 size-2 shrink-0 rounded-full bg-cyan-300" />
                <span>{task}</span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
