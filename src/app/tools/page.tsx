import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { FreeToolsHub } from '@/components/free-tools-hub';

const flowSteps = [
  { step: '01', title: '先看出風險', desc: '用 Graduation Risk Checker 先知道目前該先處理哪一塊。' },
  { step: '02', title: '再整理 Meeting', desc: '用 Meeting Assistant 把會議內容變成清楚的待辦。' },
  { step: '03', title: '持續追進度', desc: '用 Thesis Progress Tracker 看本週要推進什麼。' }
];

export default function ToolsPage() {
  return (
    <SiteShell>
      <section className="grid gap-6">
        <article className="relative overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(140deg,#315ef6_0%,#2144b2_52%,#122a79_100%)] p-7 text-white shadow-[0_28px_60px_rgba(13,35,103,0.26)] sm:p-10 lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(255,255,255,0.16),transparent_24%),radial-gradient(circle_at_78%_18%,rgba(139,180,255,0.2),transparent_18%),radial-gradient(circle_at_74%_82%,rgba(8,18,57,0.18),transparent_24%)]" />
          <div className="relative">
            <div className="inline-flex rounded-full border border-white/18 bg-white/12 px-4 py-1 text-xs font-semibold tracking-[0.16em] text-white/92">
              Free Tools MVP
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-tight sm:text-5xl lg:text-6xl">
              30 秒內，先讓研究生感受到可用的價值。
            </h1>
            <p className="mt-5 max-w-2xl text-[17px] leading-8 text-white/84">
              這一頁不是展示概念，而是直接可以操作的工具入口。先選角色，再看風險、整理 Meeting、把進度轉成下一步。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/student"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-extrabold text-[#173aac] shadow-[0_14px_30px_rgba(9,22,73,0.22)] transition hover:-translate-y-0.5"
              >
                開始畢業診斷
              </Link>
              <Link
                href="/professor"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/18 bg-white/10 px-6 text-sm font-bold text-white transition hover:bg-white/16"
              >
                教授 Beta 預覽
              </Link>
            </div>
          </div>
        </article>

        <div className="grid gap-3 md:grid-cols-3">
          {flowSteps.map((item) => (
            <div key={item.step} className="rounded-[28px] border border-[#dbe6ff] bg-white p-5 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
              <div className="text-xs font-bold text-[#2860f2]">{item.step}</div>
              <div className="mt-2 text-lg font-extrabold text-[#10203a]">{item.title}</div>
              <p className="mt-2 text-sm leading-7 text-[#62708d]">{item.desc}</p>
            </div>
          ))}
        </div>

        <FreeToolsHub />
      </section>
    </SiteShell>
  );
}
