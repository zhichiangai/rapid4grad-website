import Link from 'next/link';
import { RoleAccessPanel } from '@/components/role-access-panel';
import { SiteShell } from '@/components/site-shell';

const tools = [
  {
    title: 'Graduation Risk Checker',
    desc: '先看出目前卡點與風險等級，再決定今天要先做什麼。',
    href: '/tools#risk-checker'
  },
  {
    title: 'Meeting Assistant',
    desc: '把一次 Meeting 變成 Summary、Action Items、Next Step。',
    href: '/tools#meeting-assistant'
  },
  {
    title: 'Thesis Progress Tracker',
    desc: '把論文進度變成清楚的下一步，而不是一堆零散任務。',
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
              先選角色，再開始畢業導航。
            </h1>
            <p className="mt-5 max-w-2xl text-[17px] leading-8 text-white/84">
              如果你是訪客，可以先直接試；如果你是登入使用者，後續會保留紀錄。功能內容一樣，差別只在是否保存你的資料。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#roles"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-extrabold text-[#173aac] shadow-[0_14px_30px_rgba(9,22,73,0.22)] transition hover:-translate-y-0.5"
              >
                開始選角色
              </Link>
              <Link
                href="#tools"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/18 bg-white/10 px-6 text-sm font-bold text-white transition hover:bg-white/16"
              >
                先看免費工具
              </Link>
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/74">
              學生與教授都分成登入版與訪客版。訪客可以先看內容與操作，登入後才會保存歷史紀錄。
            </p>
          </div>
        </article>

        <section id="roles" className="grid gap-6 lg:grid-cols-2">
          <RoleAccessPanel
            roleLabel="學生區"
            title="我是學生"
            description="從診斷、結果到 Dashboard，先把研究狀態變成看得懂的下一步。"
            loginHref="/student?access=login"
            guestHref="/student?access=guest"
            loginLabel="學生登入版"
            guestLabel="學生訪客版"
            note="訪客版和登入版看到的是同一套功能。差別是登入後會保留診斷、結果與進度紀錄。"
            highlights={['先完成畢業診斷', '看今天要做什麼', '每週回來更新一次']}
          />

          <RoleAccessPanel
            roleLabel="教授區"
            title="我是教授"
            description="先看未來能怎麼管理研究室進度，再決定要不要加入 Waitlist。"
            loginHref="/professor?access=login"
            guestHref="/professor?access=guest"
            loginLabel="教授登入版"
            guestLabel="教授訪客版"
            note="教授訪客版與登入版內容一致。登入後才會保留未來研究室資料與偏好。"
            highlights={['先看 Professor Beta', '了解未來研究室功能', '加入 Waitlist']}
          />
        </section>

        <section id="tools" className="rounded-[38px] border border-[#dbe6ff] bg-white p-7 shadow-[0_18px_44px_rgba(16,32,58,0.08)] sm:p-10">
          <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#2144b2]">
            免費工具
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
          <p className="mt-5 text-sm leading-7 text-[#62708d]">
            這三個工具訪客也能直接試。登入後，後續結果才會跟你的帳號連在一起。
          </p>
        </section>
      </section>
    </SiteShell>
  );
}
