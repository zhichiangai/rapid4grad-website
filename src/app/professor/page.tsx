import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';

const accessCards = [
  {
    title: '教授登入版',
    href: '/professor?access=login',
    desc: '登入後可保留研究室資料與未來功能設定。'
  },
  {
    title: '教授訪客版',
    href: '/professor?access=guest',
    desc: '可以直接看預覽內容與未來方向，但不保存紀錄。'
  }
];

const problems = [
  '學生進度常常散在不同地方，不容易一眼看懂',
  'Meeting 和待辦沒有被整理成一個可以決策的畫面',
  '畢業風險常常太晚才發現'
];

const solutions = [
  '先把學生進度和 Meeting 紀錄放在一起',
  '把風險變成好懂的提醒和排序',
  '你只看需要決定的資訊就好'
];

export default async function ProfessorPage({
  searchParams
}: {
  searchParams?: Promise<{
    access?: string;
  }>;
}) {
  const params = (await searchParams) || {};
  const accessMode = params.access === 'login' ? '教授登入版' : '教授訪客版';

  return (
    <SiteShell>
      <section className="grid gap-6">
        <article className="rounded-[38px] border border-[#dbe6ff] bg-[linear-gradient(140deg,#315ef6_0%,#2144b2_52%,#122a79_100%)] p-7 text-white shadow-[0_28px_60px_rgba(13,35,103,0.26)] sm:p-10 lg:p-12">
          <div className="inline-flex rounded-full border border-white/18 bg-white/12 px-4 py-1 text-xs font-semibold tracking-[0.16em] text-white/92">
            教授區
          </div>
          <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[0.92] tracking-tight sm:text-5xl lg:text-6xl">
            你如果是教授，先看預覽就好。
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-8 text-white/84">
            你可以先看看未來會怎麼幫你看研究室。想保存，再登入就好。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {accessCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/18 bg-white/10 px-6 text-sm font-bold text-white transition hover:bg-white/16"
              >
                {card.title}
              </Link>
            ))}
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/74">
            {accessMode}：如果你只是想先看看，直接用訪客版就可以。
          </p>
        </article>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[34px] border border-[#dbe6ff] bg-white p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
            <div className="text-sm font-bold text-[#2144b2]">你現在可能在想</div>
            <div className="mt-4 grid gap-3">
              {problems.map((text) => (
                <div key={text} className="rounded-[22px] bg-[#f8faff] p-4 text-sm leading-7 text-[#20304b]">
                  {text}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[34px] border border-[#dbe6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f6f8ff_100%)] p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
            <div className="text-sm font-bold text-[#2144b2]">未來可以幫你</div>
            <div className="mt-4 grid gap-3">
              {solutions.map((text) => (
                <div key={text} className="rounded-[22px] border border-[#dbe6ff] bg-white p-4 text-sm leading-7 text-[#20304b]">
                  {text}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[34px] border border-[#dbe6ff] bg-white p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
            <div className="text-sm font-bold text-[#2144b2]">先留個名單</div>
            <p className="mt-4 text-[15px] leading-7 text-[#20304b]">
              如果你想先知道教授版何時上線，留名單就好。這不會進入學生診斷流程。
            </p>
            <form className="mt-5 grid gap-3">
              <label className="text-sm font-semibold text-[#1f3f9a]">
                Name
                <input
                  className="mt-2 w-full rounded-2xl border border-[#d8e4ff] bg-white px-4 py-3 text-sm text-[#10203a] outline-none focus:border-[#2f62ef] focus:ring-4 focus:ring-[#2f62ef1f]"
                  placeholder="Professor name"
                />
              </label>
              <label className="text-sm font-semibold text-[#1f3f9a]">
                Email
                <input
                  type="email"
                  className="mt-2 w-full rounded-2xl border border-[#d8e4ff] bg-white px-4 py-3 text-sm text-[#10203a] outline-none focus:border-[#2f62ef] focus:ring-4 focus:ring-[#2f62ef1f]"
                  placeholder="professor@example.com"
                />
              </label>
              <label className="text-sm font-semibold text-[#1f3f9a]">
                School
                <input
                  className="mt-2 w-full rounded-2xl border border-[#d8e4ff] bg-white px-4 py-3 text-sm text-[#10203a] outline-none focus:border-[#2f62ef] focus:ring-4 focus:ring-[#2f62ef1f]"
                  placeholder="School"
                />
              </label>
              <label className="text-sm font-semibold text-[#1f3f9a]">
                Department
                <input
                  className="mt-2 w-full rounded-2xl border border-[#d8e4ff] bg-white px-4 py-3 text-sm text-[#10203a] outline-none focus:border-[#2f62ef] focus:ring-4 focus:ring-[#2f62ef1f]"
                  placeholder="Department"
                />
              </label>
              <label className="text-sm font-semibold text-[#1f3f9a]">
                Lab Size (optional)
                <input
                  className="mt-2 w-full rounded-2xl border border-[#d8e4ff] bg-white px-4 py-3 text-sm text-[#10203a] outline-none focus:border-[#2f62ef] focus:ring-4 focus:ring-[#2f62ef1f]"
                  placeholder="例如：12 人"
                />
              </label>
              <button
                type="button"
                className="mt-2 inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#315ef6,#2144b2)] px-5 text-sm font-bold text-white"
              >
                先留名單
              </button>
              <p className="text-sm text-[#62708d]">你先看預覽就好，想保存再登入。</p>
            </form>
          </div>
        </section>
      </section>
    </SiteShell>
  );
}
