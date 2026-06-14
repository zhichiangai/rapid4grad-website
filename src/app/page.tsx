import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';

const studentBenefits = [
  '先知道自己現在卡在哪裡',
  '把 Meeting 變成可執行的下一步',
  '把風險、任務、進度整理到 Dashboard'
];

const tools = [
  {
    title: 'Meeting Assistant',
    desc: '把一次 Meeting 變成 Summary、Action Items、Next Meeting Plan。',
    href: '/tools#meeting-assistant'
  },
  {
    title: 'Thesis Progress Tracker',
    desc: '把題目、文獻、寫作、投稿變成清楚的進度節點。',
    href: '/tools#progress-tracker'
  },
  {
    title: 'Graduation Risk Checker',
    desc: '30 秒看出研究狀態的風險等級與本週優先順序。',
    href: '/tools#risk-checker'
  }
];

export default function HomePage() {
  return (
    <SiteShell>
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="relative overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(140deg,#315ef6_0%,#2144b2_52%,#122a79_100%)] p-7 text-white shadow-[0_28px_60px_rgba(13,35,103,0.26)] sm:p-10 lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.16),transparent_22%),radial-gradient(circle_at_78%_20%,rgba(139,180,255,0.18),transparent_18%),radial-gradient(circle_at_76%_80%,rgba(8,18,57,0.18),transparent_24%)]" />
          <div className="relative">
            <div className="inline-flex rounded-full border border-white/18 bg-white/12 px-4 py-1 text-xs font-semibold tracking-[0.16em] text-white/92">
              RAPID4GRAD
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[0.92] tracking-tight sm:text-5xl lg:text-6xl">
              開始畢業診斷，把混亂變成下一步。
            </h1>
            <p className="mt-5 max-w-2xl text-[17px] leading-8 text-white/84">
              你只要留下 Email，RAPID4GRAD 就會幫你整理個人化畢業診斷、免費指南、Meeting 模板與進度追蹤建議。這一版主要服務研究生；教授版先以 Beta 預覽呈現。
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Link
                href="/student"
                className="rounded-[30px] border border-white/14 bg-white/12 p-5 transition hover:-translate-y-0.5 hover:bg-white/16"
              >
                <div className="text-xs font-bold tracking-[0.14em] text-white/72">主入口 · 研究生</div>
                <div className="mt-2 text-2xl font-black text-white">開始畢業診斷</div>
                <p className="mt-2 text-sm leading-7 text-white/78">
                  如果你現在卡在題目、文獻、Meeting 或投稿，從這裡開始。
                </p>
              </Link>
              <Link
                href="/professor"
                className="rounded-[30px] border border-white/14 bg-white/10 p-5 transition hover:-translate-y-0.5 hover:bg-white/16"
              >
                <div className="text-xs font-bold tracking-[0.14em] text-white/72">次入口 · 教授 Beta</div>
                <div className="mt-2 text-2xl font-black text-white">Professor Program Preview</div>
                <p className="mt-2 text-sm leading-7 text-white/78">
                  如果你想先了解未來能怎麼追蹤研究室進度，可以看預覽版。
                </p>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/diagnosis"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-extrabold text-[#173aac] shadow-[0_14px_30px_rgba(9,22,73,0.22)] transition hover:-translate-y-0.5"
              >
                開始畢業診斷
              </Link>
              <Link
                href="/tools"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/18 bg-white/10 px-6 text-sm font-bold text-white transition hover:bg-white/16"
              >
                瀏覽工具
              </Link>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/74">
              留下 Email 後，你會收到個人化畢業診斷、免費畢業指南、Meeting 模板與後續進度提醒。
            </p>
          </div>
        </article>

        <aside className="grid gap-4">
          <div className="rounded-[34px] border border-[#dbe6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f6f8ff_100%)] p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
            <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-bold tracking-[0.12em] text-[#2144b2]">
              學生會得到什麼
            </div>
            <div className="mt-5 grid gap-3">
              {studentBenefits.map((text, index) => (
                <div key={text} className="rounded-[24px] border border-[#dbe6ff] bg-white p-4 shadow-[0_10px_18px_rgba(18,39,92,0.04)]">
                  <div className="text-xs font-bold text-[#2860f2]">0{index + 1}</div>
                  <p className="mt-2 text-[15px] leading-7 text-[#20304b]">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[34px] border border-[#dbe6ff] bg-white p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
            <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-bold tracking-[0.12em] text-[#2144b2]">
              教授 Beta 預覽
            </div>
            <p className="mt-4 text-[15px] leading-7 text-[#20304b]">
              Professor Dashboard 還在未來階段。現在先看它能解決什麼問題，以及未來如何幫教授快速掌握研究室進度。
            </p>
            <Link
              href="/professor"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-[#dbe6ff] bg-[#f8faff] px-5 text-sm font-bold text-[#2144b2] transition hover:bg-white"
            >
              看 Professor Program Preview
            </Link>
          </div>
        </aside>
      </section>

      <section className="mt-6 rounded-[38px] border border-[#dbe6ff] bg-white p-7 shadow-[0_18px_44px_rgba(16,32,58,0.08)] sm:p-10">
        <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#2144b2]">
          核心工具
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {tools.map((tool) => (
            <Link
              key={tool.title}
              href={tool.href}
              className="rounded-[28px] border border-[#dbe6ff] bg-[#f8faff] p-6 transition hover:-translate-y-0.5 hover:bg-white"
            >
              <div className="text-2xl font-black text-[#2144b2]">{tool.title}</div>
              <p className="mt-3 text-[15px] leading-7 text-[#62708d]">{tool.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
