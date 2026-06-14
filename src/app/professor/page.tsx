'use client';

import { useState } from 'react';
import { SiteShell } from '@/components/site-shell';

const problems = [
  '很難快速看出哪些學生卡住了',
  'Meeting 與進度沒有被整理成可追蹤狀態',
  '畢業風險通常太晚才被發現'
];

const solutions = [
  '先聚合學生進度與 Meeting 紀錄',
  '把風險變成清楚的提醒與排序',
  '讓教授只看需要決策的資訊'
];

const sampleBenefits = [
  '收到 Professor Beta 更新',
  '優先看到研究室版功能進展',
  '未來可以先試用教授版預覽'
];

const initialForm = {
  name: '',
  email: '',
  school: '',
  department: '',
  labSize: ''
};

export default function ProfessorPage() {
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);

  return (
    <SiteShell>
      <section className="grid gap-6">
        <article className="rounded-[38px] border border-[#dbe6ff] bg-[linear-gradient(140deg,#315ef6_0%,#2144b2_52%,#122a79_100%)] p-7 text-white shadow-[0_28px_60px_rgba(13,35,103,0.26)] sm:p-10 lg:p-12">
          <div className="inline-flex rounded-full border border-white/18 bg-white/12 px-4 py-1 text-xs font-semibold tracking-[0.16em] text-white/92">
            Professor Program Preview
          </div>
          <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[0.92] tracking-tight sm:text-5xl lg:text-6xl">
            未來可以幫教授更快看懂研究室狀況。
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-8 text-white/84">
            這不是已經完成的 Dashboard。RAPID 的教授版未來會聚合學生進度、Meeting 管理與畢業風險，幫教授用更少時間掌握需要介入的學生。
          </p>
        </article>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[34px] border border-[#dbe6ff] bg-white p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
            <div className="text-sm font-bold text-[#2144b2]">問題</div>
            <div className="mt-4 grid gap-3">
              {problems.map((text) => (
                <div key={text} className="rounded-[22px] bg-[#f8faff] p-4 text-sm leading-7 text-[#20304b]">
                  {text}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[34px] border border-[#dbe6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f6f8ff_100%)] p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
            <div className="text-sm font-bold text-[#2144b2]">未來解法</div>
            <div className="mt-4 grid gap-3">
              {solutions.map((text) => (
                <div key={text} className="rounded-[22px] border border-[#dbe6ff] bg-white p-4 text-sm leading-7 text-[#20304b]">
                  {text}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[34px] border border-[#dbe6ff] bg-white p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
            <div className="text-sm font-bold text-[#2144b2]">教授 Waitlist</div>
            <p className="mt-4 text-[15px] leading-7 text-[#20304b]">
              留下資料，未來教授版上線時優先通知你。這不會進入學生診斷流程。
            </p>
            <form
              className="mt-5 grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                setSubmitted(true);
              }}
            >
              <label className="text-sm font-semibold text-[#1f3f9a]">
                Name
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-[#d8e4ff] bg-white px-4 py-3 text-sm text-[#10203a] outline-none focus:border-[#2f62ef] focus:ring-4 focus:ring-[#2f62ef1f]"
                  placeholder="Professor name"
                />
              </label>
              <label className="text-sm font-semibold text-[#1f3f9a]">
                Email
                <input
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  type="email"
                  className="mt-2 w-full rounded-2xl border border-[#d8e4ff] bg-white px-4 py-3 text-sm text-[#10203a] outline-none focus:border-[#2f62ef] focus:ring-4 focus:ring-[#2f62ef1f]"
                  placeholder="professor@example.com"
                />
              </label>
              <label className="text-sm font-semibold text-[#1f3f9a]">
                School
                <input
                  value={form.school}
                  onChange={(event) => setForm((prev) => ({ ...prev, school: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-[#d8e4ff] bg-white px-4 py-3 text-sm text-[#10203a] outline-none focus:border-[#2f62ef] focus:ring-4 focus:ring-[#2f62ef1f]"
                  placeholder="School"
                />
              </label>
              <label className="text-sm font-semibold text-[#1f3f9a]">
                Department
                <input
                  value={form.department}
                  onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-[#d8e4ff] bg-white px-4 py-3 text-sm text-[#10203a] outline-none focus:border-[#2f62ef] focus:ring-4 focus:ring-[#2f62ef1f]"
                  placeholder="Department"
                />
              </label>
              <label className="text-sm font-semibold text-[#1f3f9a]">
                Lab Size (optional)
                <input
                  value={form.labSize}
                  onChange={(event) => setForm((prev) => ({ ...prev, labSize: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-[#d8e4ff] bg-white px-4 py-3 text-sm text-[#10203a] outline-none focus:border-[#2f62ef] focus:ring-4 focus:ring-[#2f62ef1f]"
                  placeholder="例如：12 人"
                />
              </label>
              <button
                type="submit"
                className="mt-2 inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#315ef6,#2144b2)] px-5 text-sm font-bold text-white"
              >
                加入 Waitlist
              </button>
              {submitted ? (
                <p className="text-sm font-semibold text-[#1d7b52]">已收到，之後教授版預覽會優先通知你。</p>
              ) : (
                <p className="text-sm text-[#62708d]">這是教授 Waitlist，不會進入學生診斷流程。</p>
              )}
            </form>
            <div className="mt-5 grid gap-3">
              {sampleBenefits.map((text) => (
                <div key={text} className="rounded-[22px] bg-[#f8faff] p-4 text-sm leading-7 text-[#20304b]">
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
