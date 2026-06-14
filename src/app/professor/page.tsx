import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';

const stats = [
  { label: '學生數', value: '24' },
  { label: '高風險學生', value: '5' },
  { label: '本週 Meeting', value: '8' },
  { label: '待追蹤任務', value: '13' }
];

const alerts = [
  '3 位學生超過兩週沒有更新進度',
  '2 位學生的投稿節奏偏慢',
  '1 位學生的論文方向仍未收斂'
];

const meetings = [
  '張同學 - 需要先釐清研究方向',
  '陳同學 - 下一次 Meeting 要確認投稿策略',
  '林同學 - 目前卡在寫作收斂'
];

export default function ProfessorPage() {
  return (
    <SiteShell>
      <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <article className="rounded-[38px] border border-[#dbe6ff] bg-[linear-gradient(140deg,#315ef6_0%,#2144b2_52%,#122a79_100%)] p-7 text-white shadow-[0_28px_60px_rgba(13,35,103,0.26)] sm:p-10 lg:p-12">
          <div className="inline-flex rounded-full border border-white/18 bg-white/12 px-4 py-1 text-xs font-semibold tracking-[0.16em] text-white/92">
            我是教授
          </div>
          <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[0.92] tracking-tight sm:text-5xl lg:text-6xl">
            先看決策資訊，不看雜訊。
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-8 text-white/84">
            教授版不是 CRM，也不是操作後台。先看誰卡住、誰延遲、誰快畢業，再決定這週要先處理哪個學生。
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-extrabold text-[#173aac]">
              看學生 Dashboard
            </Link>
            <Link href="/tools" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/18 bg-white/10 px-6 text-sm font-bold text-white">
              看學生工具
            </Link>
          </div>
        </article>

        <aside className="grid gap-4">
          <div className="rounded-[34px] border border-[#dbe6ff] bg-white p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
            <div className="text-sm font-bold text-[#2144b2]">研究室總覽</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-[22px] bg-[#f8faff] p-4">
                  <div className="text-xs font-bold text-[#2860f2]">{stat.label}</div>
                  <div className="mt-2 text-3xl font-black text-[#10203a]">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[34px] border border-[#dbe6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f6f8ff_100%)] p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
            <div className="text-sm font-bold text-[#2144b2]">需要注意的學生</div>
            <div className="mt-4 grid gap-3">
              {alerts.map((text) => (
                <div key={text} className="rounded-[22px] border border-[#dbe6ff] bg-white p-4 text-sm leading-7 text-[#20304b]">
                  {text}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[34px] border border-[#dbe6ff] bg-white p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
          <div className="text-sm font-bold text-[#2144b2]">本週 Meeting</div>
          <div className="mt-4 grid gap-3">
            {meetings.map((item) => (
              <div key={item} className="rounded-[22px] bg-[#f8faff] p-4 text-sm leading-7 text-[#20304b]">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[34px] border border-[#dbe6ff] bg-[#f8faff] p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
          <div className="text-sm font-bold text-[#2144b2]">教授這週先做什麼</div>
          <div className="mt-4 grid gap-3 text-sm leading-7 text-[#20304b]">
            <div className="rounded-[22px] border border-[#dbe6ff] bg-white p-4">先確認高風險學生的下一步</div>
            <div className="rounded-[22px] border border-[#dbe6ff] bg-white p-4">先追一個最卡的 Meeting</div>
            <div className="rounded-[22px] border border-[#dbe6ff] bg-white p-4">先處理一個快畢業但還沒收尾的學生</div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
