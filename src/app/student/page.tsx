import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';

const accessCards = [
  {
    title: '學生登入版',
    href: '/student?access=login',
    desc: '登入後可保存診斷、結果與 Dashboard 紀錄。'
  },
  {
    title: '學生訪客版',
    href: '/student?access=guest',
    desc: '可以直接試用相同功能，但不保存歷史紀錄。'
  }
];

const tools = [
  ['免費診斷', '先把研究狀態說清楚，再看風險與下一步。'],
  ['免費工具', '先用風險、Meeting、進度三個工具快速上手。'],
  ['學生 Dashboard', '把本週任務、風險和資源整理成一頁。']
];

export default async function StudentPage({
  searchParams
}: {
  searchParams?: Promise<{
    access?: string;
  }>;
}) {
  const params = (await searchParams) || {};
  const accessMode = params.access === 'login' ? '學生登入版' : '學生訪客版';

  return (
    <SiteShell>
      <section className="grid gap-6">
        <article className="rounded-[38px] border border-[#dbe6ff] bg-[linear-gradient(140deg,#315ef6_0%,#2144b2_52%,#122a79_100%)] p-7 text-white shadow-[0_28px_60px_rgba(13,35,103,0.26)] sm:p-10 lg:p-12">
          <div className="inline-flex rounded-full border border-white/18 bg-white/12 px-4 py-1 text-xs font-semibold tracking-[0.16em] text-white/92">
            學生區
          </div>
          <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[0.92] tracking-tight sm:text-5xl lg:text-6xl">
            先選學生登入版，或直接用訪客版開始。
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-8 text-white/84">
            兩種模式看到的功能是一樣的。差別只在登入版會保留紀錄，訪客版不會留下歷史資料。
          </p>
          <div className="mt-5 inline-flex rounded-full border border-white/18 bg-white/12 px-4 py-2 text-sm font-bold text-white">
            目前模式：{accessMode}
          </div>
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
            如果你只是想先看內容，訪客版就夠了；如果你想之後回來接著做，登入版比較適合。
          </p>
        </article>

        <div className="grid gap-4 lg:grid-cols-3">
          {tools.map(([title, desc]) => (
            <div key={title} className="rounded-[34px] border border-[#dbe6ff] bg-white p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
              <div className="text-sm font-bold text-[#2144b2]">{title}</div>
              <p className="mt-4 text-[15px] leading-7 text-[#20304b]">{desc}</p>
            </div>
          ))}
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="rounded-[38px] border border-[#dbe6ff] bg-white p-7 shadow-[0_18px_44px_rgba(16,32,58,0.08)] sm:p-10">
            <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#2144b2]">
              學生功能
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-[#10203a]">你會先看到什麼</h2>
            <div className="mt-5 grid gap-3">
              {[
                '先完成畢業診斷，知道自己現在卡在哪裡',
                '看結果頁，把風險和本週三件事講清楚',
                '回到 Dashboard，每週只看今天最重要的任務'
              ].map((text, index) => (
                <div key={text} className="rounded-[22px] bg-[#f8faff] p-4 text-[15px] leading-7 text-[#20304b]">
                  <span className="mr-2 text-xs font-bold text-[#2860f2]">0{index + 1}</span>
                  {text}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[38px] border border-[#dbe6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] p-7 shadow-[0_18px_44px_rgba(16,32,58,0.08)] sm:p-10">
            <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#2144b2]">
              訪客與登入差異
            </div>
            <div className="mt-5 grid gap-3">
              <div className="rounded-[24px] border border-[#dbe6ff] bg-white p-4 text-sm leading-7 text-[#20304b]">
                訪客版可以直接試，不會留下紀錄。
              </div>
              <div className="rounded-[24px] border border-[#dbe6ff] bg-white p-4 text-sm leading-7 text-[#20304b]">
                登入版可以保存診斷、結果和進度，之後可以接著做。
              </div>
              <div className="rounded-[24px] border border-[#dbe6ff] bg-white p-4 text-sm leading-7 text-[#20304b]">
                兩者看見的內容一致，差別只在記錄與回訪。
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/diagnosis"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#315ef6,#2144b2)] px-5 text-sm font-bold text-white"
              >
                開始畢業診斷
              </Link>
              <Link
                href="/tools"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#dbe6ff] bg-white px-5 text-sm font-bold text-[#2144b2]"
              >
                先看免費工具
              </Link>
            </div>
          </div>
        </section>
      </section>
    </SiteShell>
  );
}
