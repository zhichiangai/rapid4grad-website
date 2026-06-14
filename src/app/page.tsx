import Link from 'next/link';
import { RoleAccessPanel } from '@/components/role-access-panel';
import { SiteShell } from '@/components/site-shell';

const tools = [
  {
    title: '我現在不知道風險高不高',
    desc: '先看風險，再決定今天要先做什麼。',
    href: '/tools#risk-checker'
  },
  {
    title: '我剛 meeting 完，還不知道怎麼整理',
    desc: '先把 meeting 重點變成待辦。',
    href: '/tools#meeting-assistant'
  },
  {
    title: '我的論文進度很亂',
    desc: '先抓出今天最重要的一件事。',
    href: '/tools#progress-tracker'
  }
];

export default function HomePage() {
  return (
    <SiteShell>
      <section className="grid gap-6">
        <article className="relative overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(140deg,#315ef6_0%,#2144b2_52%,#122a79_100%)] p-7 text-white shadow-[0_28px_60px_rgba(13,35,103,0.26)] sm:p-10 lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.16),transparent_22%),radial-gradient(circle_at_78%_20%,rgba(139,180,255,0.18),transparent_18%),radial-gradient(circle_at_76%_80%,rgba(8,18,57,0.18),transparent_24%)]" />
          <div className="relative">
            <div className="inline-flex rounded-full border border-white/18 bg-white/12 px-4 py-1 text-xs font-semibold tracking-[0.16em] text-white/92">
              RAPID4GRAD
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-tight sm:text-5xl lg:text-6xl">
              你現在是不是卡住了？
            </h1>
            <p className="mt-5 max-w-2xl text-[17px] leading-8 text-white/84">
              你不用先懂這個網站。先告訴我你是學生還是教授，我先幫你整理今天先做什麼。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#roles"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-extrabold text-[#173aac] shadow-[0_14px_30px_rgba(9,22,73,0.22)] transition hover:-translate-y-0.5"
              >
                幫我看下一步
              </Link>
              <Link
                href="#tools"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/18 bg-white/10 px-6 text-sm font-bold text-white transition hover:bg-white/16"
              >
                我先看情境
              </Link>
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/74">
              你先直接開始也可以，想保存歷史再登入就好。
            </p>
          </div>
        </article>

        <section id="roles" className="grid gap-6 lg:grid-cols-2">
          <RoleAccessPanel
            roleLabel="學生區"
            title="我是學生"
            description="你先不用想整個系統，先從診斷開始，我幫你看今天先做什麼。"
            loginHref="/student?access=login"
            guestHref="/student?access=guest"
            loginLabel="想保存再登入"
            guestLabel="先直接開始"
            note="你先直接開始就好。想回來看紀錄，再登入保存。"
            highlights={['先做診斷', '先看今天要做什麼', '之後再保存歷史']}
          />

          <RoleAccessPanel
            roleLabel="教授區"
            title="我是教授"
            description="先看教授版預覽，知道未來會怎麼幫你看研究室。"
            loginHref="/professor?access=login"
            guestHref="/professor?access=guest"
            loginLabel="想保存再登入"
            guestLabel="先看教授預覽"
            note="如果你只是想先看看，直接用訪客版就好。"
            highlights={['先看教授預覽', '了解未來會怎麼用', '之後再決定要不要加入']}
          />
        </section>

        <section id="tools" className="rounded-[38px] border border-[#dbe6ff] bg-white p-7 shadow-[0_18px_44px_rgba(16,32,58,0.08)] sm:p-10">
          <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#2144b2]">
            你現在想先解哪一件
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {tools.map((tool) => (
              <Link
                key={tool.title}
                href={tool.href}
                className="rounded-[28px] border border-[#dbe6ff] bg-[#f8faff] p-6 transition hover:-translate-y-0.5 hover:bg-white"
              >
                <div className="text-xs font-bold tracking-[0.14em] text-[#2860f2]">先看情境</div>
                <div className="mt-2 text-2xl font-black text-[#2144b2]">{tool.title}</div>
                <p className="mt-3 text-[15px] leading-7 text-[#62708d]">{tool.desc}</p>
              </Link>
            ))}
          </div>
          <p className="mt-5 text-sm leading-7 text-[#62708d]">
            你可以先直接試。想保存歷史，再登入就好。
          </p>
        </section>
      </section>
    </SiteShell>
  );
}
