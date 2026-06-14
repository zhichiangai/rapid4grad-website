import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { FreeToolsHub } from '@/components/free-tools-hub';

const tools = [
  {
    title: 'Graduation Risk Checker',
    desc: '先看目前風險高不高，再決定本週要先處理什麼。',
    href: '#risk-checker'
  },
  {
    title: 'Meeting Assistant',
    desc: '把一次 Meeting 變成可以直接拿去用的重點與待辦。',
    href: '#meeting-assistant'
  },
  {
    title: 'Thesis Progress Tracker',
    desc: '把論文進度整理成清楚的一頁，不再只是一堆零碎項目。',
    href: '#progress-tracker'
  }
];

export default function ToolsPage() {
  return (
    <SiteShell>
      <section className="grid gap-6">
        <article className="relative overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(140deg,#315ef6_0%,#2144b2_52%,#122a79_100%)] p-7 text-white shadow-[0_28px_60px_rgba(13,35,103,0.26)] sm:p-10 lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(255,255,255,0.16),transparent_24%),radial-gradient(circle_at_78%_18%,rgba(139,180,255,0.2),transparent_18%),radial-gradient(circle_at_74%_82%,rgba(8,18,57,0.18),transparent_24%)]" />
          <div className="relative">
            <div className="inline-flex rounded-full border border-white/18 bg-white/12 px-4 py-1 text-xs font-semibold tracking-[0.16em] text-white/92">
              Free Tools
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-tight sm:text-5xl lg:text-6xl">
              直接選工具，立刻拿到可用結果。
            </h1>
            <p className="mt-5 max-w-2xl text-[17px] leading-8 text-white/84">
              這一頁不講流程，只給你可以直接使用的工具入口。先點進去，再看細節。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#tools"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-extrabold text-[#173aac] shadow-[0_14px_30px_rgba(9,22,73,0.22)] transition hover:-translate-y-0.5"
              >
                立即使用工具
              </Link>
              <Link
                href="/diagnosis"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/18 bg-white/10 px-6 text-sm font-bold text-white transition hover:bg-white/16"
              >
                開始畢業診斷
              </Link>
            </div>
          </div>
        </article>

        <section id="tools" className="grid gap-4 lg:grid-cols-3">
          {tools.map((tool) => (
            <Link
              key={tool.title}
              href={tool.href}
              className="rounded-[30px] border border-[#dbe6ff] bg-white p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)] transition hover:-translate-y-0.5 hover:bg-[#f8faff]"
            >
              <div className="text-2xl font-black text-[#2144b2]">{tool.title}</div>
              <p className="mt-3 text-[15px] leading-7 text-[#62708d]">{tool.desc}</p>
              <span className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#315ef6,#2144b2)] px-5 text-sm font-bold text-white">
                立即使用
              </span>
            </Link>
          ))}
        </section>

        <FreeToolsHub />
      </section>
    </SiteShell>
  );
}
