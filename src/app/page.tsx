import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';

const highlights = [
  { value: '3 分鐘', label: '完成診斷' },
  { value: '1 封 Email', label: '立即收到摘要' },
  { value: '1 個 Dashboard', label: '每天回來看下一步' }
];

const pillars = [
  '題目收斂',
  '文獻整理',
  'Meeting 準備',
  '寫作推進',
  '投稿節奏',
  '畢業風險'
];

const tools = [
  {
    title: 'Graduation Risk Checker',
    desc: '30 秒看出你現在是不是已經接近延畢風險。',
    href: '/tools#risk-checker'
  },
  {
    title: 'Meeting Assistant',
    desc: '把 Meeting 內容整理成老師看得懂的下一步。',
    href: '/tools#meeting-assistant'
  },
  {
    title: 'Thesis Progress Tracker',
    desc: '把論文進度變成可視化任務，不再只靠感覺。',
    href: '/tools#progress-tracker'
  }
];

export default function HomePage() {
  return (
    <SiteShell>
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="relative overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(140deg,#315ef6_0%,#2144b2_52%,#122a79_100%)] p-7 text-white shadow-[0_28px_60px_rgba(13,35,103,0.26)] sm:p-10 lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.14),transparent_22%),radial-gradient(circle_at_78%_18%,rgba(139,180,255,0.18),transparent_18%),radial-gradient(circle_at_75%_82%,rgba(8,18,57,0.18),transparent_24%)]" />
          <div className="relative">
            <div className="inline-flex rounded-full border border-white/18 bg-white/12 px-4 py-1 text-xs font-semibold tracking-[0.16em] text-white/92">
              RAPID4GRAD
            </div>

            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[0.92] tracking-tight sm:text-5xl lg:text-6xl">
              把研究生的混亂，變成每天都看得懂的下一步。
            </h1>
            <p className="mt-5 max-w-2xl text-[17px] leading-8 text-white/84">
              先完成免費診斷，系統會幫你判斷卡點、風險與優先順序，再把結果整理成 Email 與 Dashboard，讓你知道今天要先做什麼。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/diagnosis"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-extrabold text-[#173aac] shadow-[0_14px_30px_rgba(9,22,73,0.22)] transition hover:-translate-y-0.5"
              >
                立即開始診斷
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/18 bg-white/10 px-6 text-sm font-bold text-white transition hover:bg-white/16"
              >
                看 Dashboard 範例
              </Link>
            </div>

            <div className="mt-9 grid gap-3 sm:grid-cols-3">
              {highlights.map((item) => (
                <div key={item.label} className="rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                  <div className="text-2xl font-black">{item.value}</div>
                  <div className="mt-1 text-sm text-white/78">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur">
              <div className="text-sm font-bold text-white/84">30 秒內看見價值</div>
              <p className="mt-2 max-w-xl text-sm leading-7 text-white/78">
                先用免費工具看到結果，再進診斷與 Dashboard。這不是額外內容，而是主流程的入口。
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {tools.map((tool) => (
                  <Link
                    key={tool.title}
                    href={tool.href}
                    className="rounded-[22px] border border-white/14 bg-white/10 p-4 transition hover:-translate-y-0.5 hover:bg-white/16"
                  >
                    <div className="text-sm font-extrabold text-white">{tool.title}</div>
                    <p className="mt-2 text-sm leading-6 text-white/76">{tool.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </article>

        <aside className="grid gap-4">
          <div className="rounded-[34px] border border-[#dbe6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f6f8ff_100%)] p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
            <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-bold tracking-[0.12em] text-[#2144b2]">
              你會得到什麼
            </div>
            <div className="mt-5 grid gap-3">
              {[
                '快速判斷你目前卡在哪個研究環節',
                '直接給你 3 個最值得先做的動作',
                '把結果同步成可回來查看的 Email 與 Dashboard'
              ].map((text, index) => (
                <div key={text} className="rounded-[24px] border border-[#dbe6ff] bg-white p-4 shadow-[0_10px_18px_rgba(18,39,92,0.04)]">
                  <div className="text-xs font-bold text-[#2860f2]">0{index + 1}</div>
                  <p className="mt-2 text-[15px] leading-7 text-[#20304b]">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[34px] border border-[#dbe6ff] bg-white p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-[#2144b2]">你可以先處理的事情</div>
                <p className="mt-1 text-sm text-[#62708d]">把研究狀況拆成可執行的模組</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-[linear-gradient(135deg,#315ef6,#2144b2)] shadow-[0_12px_22px_rgba(33,68,178,0.22)]" />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {pillars.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[#d7e2ff] bg-[#f6f8ff] px-3 py-2 text-sm font-semibold text-[#2347b8]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </SiteShell>
  );
}
