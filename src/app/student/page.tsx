import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';

const modeCards = [
  {
    title: '先直接開始',
    href: '/diagnosis',
    action: '幫我看下一步',
    desc: '先做診斷，先看今天要做什麼。',
    badge: '不用先登入'
  },
  {
    title: '想保存歷史再登入',
    href: '/diagnosis',
    action: '先看一下',
    desc: '如果你之後想回來看紀錄，再登入就好。',
    badge: '之後再保存'
  }
];

const benefits = [
  '你先回答最卡的地方',
  '我先幫你整理今天要做什麼',
  '想保存歷史，再登入就好'
];

export default async function StudentPage({
  searchParams
}: {
  searchParams?: Promise<{
    access?: string;
  }>;
}) {
  const params = (await searchParams) || {};
  const currentMode = params.access === 'login' ? '學生登入版' : '學生訪客版';

  return (
    <SiteShell>
      <section className="grid gap-6">
        <article className="rounded-[38px] border border-[#dbe6ff] bg-[linear-gradient(140deg,#315ef6_0%,#2144b2_52%,#122a79_100%)] p-7 text-white shadow-[0_28px_60px_rgba(13,35,103,0.26)] sm:p-10 lg:p-12">
          <div className="inline-flex rounded-full border border-white/18 bg-white/12 px-4 py-1 text-xs font-semibold tracking-[0.16em] text-white/92">
            學生區
          </div>
          <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[0.92] tracking-tight sm:text-5xl lg:text-6xl">
            你現在卡在不知道下一步嗎？
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-8 text-white/84">
            你不用先懂系統，先直接開始。想保存歷史再登入就好。
          </p>
          <div className="mt-5 inline-flex rounded-full border border-white/18 bg-white/12 px-4 py-2 text-sm font-bold text-white">
            目前模式：{currentMode}
          </div>
        </article>

        <section className="grid gap-4 lg:grid-cols-2">
          {modeCards.map((card) => (
            <article
              key={card.title}
              className="rounded-[34px] border border-[#dbe6ff] bg-white p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]"
            >
              <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#2144b2]">
                {card.badge}
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-[#10203a]">{card.title}</h2>
              <p className="mt-3 text-[15px] leading-7 text-[#62708d]">{card.desc}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={card.href}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#315ef6,#2144b2)] px-5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(33,68,178,0.18)]"
                >
                  {card.action}
                </Link>
                <Link
                  href="/tools"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#dbe6ff] bg-white px-5 text-sm font-bold text-[#2144b2]"
                >
                  先看情境
                </Link>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="rounded-[38px] border border-[#dbe6ff] bg-white p-7 shadow-[0_18px_44px_rgba(16,32,58,0.08)] sm:p-10">
            <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#2144b2]">
              你現在先做什麼
            </div>
            <div className="mt-5 grid gap-3">
              {benefits.map((text) => (
                <div key={text} className="rounded-[22px] bg-[#f8faff] p-4 text-[15px] leading-7 text-[#20304b]">
                  {text}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[38px] border border-[#dbe6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] p-7 shadow-[0_18px_44px_rgba(16,32,58,0.08)] sm:p-10">
            <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#2144b2]">
              先直接開始
            </div>
            <div className="mt-5 grid gap-3">
              <div className="rounded-[24px] border border-[#dbe6ff] bg-white p-4 text-sm leading-7 text-[#20304b]">
                你先做診斷，我先幫你看今天該做什麼。
              </div>
              <div className="rounded-[24px] border border-[#dbe6ff] bg-white p-4 text-sm leading-7 text-[#20304b]">
                想保存歷史，再登入就好。
              </div>
              <div className="rounded-[24px] border border-[#dbe6ff] bg-white p-4 text-sm leading-7 text-[#20304b]">
                你不用一次想完，先回答最卡的地方。
              </div>
            </div>
          </div>
        </section>
      </section>
    </SiteShell>
  );
}
