import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';

const modeCards = [
  {
    title: '學生登入版',
    href: '/diagnosis',
    action: '登入保存',
    desc: '會保留你的診斷、結果與 Dashboard 紀錄。',
    badge: '適合之後要回來接著做'
  },
  {
    title: '學生訪客版',
    href: '/diagnosis',
    action: '直接開始',
    desc: '可以直接使用相同功能，但不保存歷史資料。',
    badge: '適合先看看再決定'
  }
];

const benefits = [
  '先完成畢業診斷',
  '直接看到本週三件事',
  '每週回來只要看今天最重要的一件事'
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
            先選登入版或訪客版，再直接開始。
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-8 text-white/84">
            兩種模式功能一樣。差別只在登入版會記錄歷史，訪客版不會留存。
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
                  看免費工具
                </Link>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="rounded-[38px] border border-[#dbe6ff] bg-white p-7 shadow-[0_18px_44px_rgba(16,32,58,0.08)] sm:p-10">
            <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#2144b2]">
              你會先看到什麼
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
              差異只在記錄
            </div>
            <div className="mt-5 grid gap-3">
              <div className="rounded-[24px] border border-[#dbe6ff] bg-white p-4 text-sm leading-7 text-[#20304b]">
                訪客版可以直接使用，不會留下紀錄。
              </div>
              <div className="rounded-[24px] border border-[#dbe6ff] bg-white p-4 text-sm leading-7 text-[#20304b]">
                登入版會保存診斷、結果與進度，之後可以繼續。
              </div>
              <div className="rounded-[24px] border border-[#dbe6ff] bg-white p-4 text-sm leading-7 text-[#20304b]">
                你不用先理解系統，只要先開始。
              </div>
            </div>
          </div>
        </section>
      </section>
    </SiteShell>
  );
}
