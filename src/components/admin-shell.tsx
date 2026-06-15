'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ADMIN_SESSION_KEY, adminNavItems } from '@/lib/growth-dashboard';
import { SITE_NAME } from '@/lib/site';

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [adminName, setAdminName] = useState('RAPID Team');

  useEffect(() => {
    const raw = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) {
      router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    try {
      const session = JSON.parse(raw) as { name?: string };
      if (session.name) setAdminName(session.name);
    } catch {
      router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setReady(true);
  }, [pathname, router]);

  const activePath = useMemo(() => pathname, [pathname]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e9efff,transparent_28%),linear-gradient(180deg,#f5f8ff_0%,#eef3ff_100%)] text-[#10203a]">
        <div className="mx-auto flex min-h-screen w-[min(1480px,calc(100%-24px))] items-center justify-center">
          <div className="rounded-[36px] border border-white/70 bg-white/80 px-7 py-6 text-sm font-semibold text-[#2144b2] shadow-[0_18px_60px_rgba(16,32,58,0.12)] backdrop-blur">
            正在進入 Growth Dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e9efff,transparent_28%),radial-gradient(circle_at_top_right,rgba(49,94,246,0.1),transparent_20%),linear-gradient(180deg,#f5f8ff_0%,#eef3ff_100%)] text-[#10203a]">
      <div className="mx-auto grid min-h-screen w-[min(1480px,calc(100%-24px))] gap-5 py-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-[36px] border border-white/70 bg-white/84 p-5 shadow-[0_24px_70px_rgba(16,32,58,0.08)] backdrop-blur-xl lg:sticky lg:top-5 lg:h-[calc(100vh-40px)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#315ef6,#2144b2)] text-lg font-black text-white shadow-[0_12px_24px_rgba(33,68,178,0.28)]">
              R
            </div>
            <div>
              <div className="text-[15px] font-black tracking-tight text-[#10203a]">{SITE_NAME}</div>
              <div className="text-xs font-semibold tracking-[0.14em] text-[#6a7a97]">GROWTH DASHBOARD V1</div>
            </div>
          </div>

          <div className="mt-5 rounded-[28px] border border-[#dbe6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] p-4">
            <div className="text-xs font-bold tracking-[0.16em] text-[#2144b2]">已登入</div>
            <div className="mt-2 text-lg font-black text-[#10203a]">{adminName}</div>
            <p className="mt-2 text-sm leading-6 text-[#62708d]">目前以 Google Sheet / Apps Script 的資料流做 V1 監控。</p>
          </div>

          <nav className="mt-5 grid gap-2">
            {adminNavItems.map((item) => {
              const active = activePath === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'rounded-[20px] px-4 py-3 text-sm font-semibold transition',
                    active
                      ? 'bg-[linear-gradient(135deg,#315ef6,#2144b2)] text-white shadow-[0_14px_24px_rgba(33,68,178,0.2)]'
                      : 'border border-[#dbe6ff] bg-white text-[#21345c] hover:bg-[#f7f9ff]'
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-5 rounded-[28px] border border-[#dbe6ff] bg-[#f8faff] p-4">
            <div className="text-xs font-bold tracking-[0.14em] text-[#2144b2]">V1 重點</div>
            <p className="mt-2 text-sm leading-6 text-[#62708d]">先看數據流失，不做 CRM。先看名單品質，不做成交管理。</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#dbe6ff] bg-white px-4 text-sm font-bold text-[#2144b2]"
            >
              回前台
            </Link>
            <button
              type="button"
              onClick={() => {
                window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
                router.replace('/admin/login');
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#10203a] px-4 text-sm font-bold text-white"
            >
              登出
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-5">
          <header className="rounded-[36px] border border-white/70 bg-white/80 px-5 py-4 shadow-[0_18px_50px_rgba(16,32,58,0.08)] backdrop-blur-xl sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs font-bold tracking-[0.16em] text-[#2144b2]">RAPID Growth Dashboard</div>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-[#10203a]">先看數據，再決定下一步。</h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-[#dbe6ff] bg-[#f8faff] px-3 py-1 text-xs font-semibold text-[#2144b2]">
                  Google Sheet source
                </span>
                <span className="inline-flex items-center rounded-full border border-[#dbe6ff] bg-[#f8faff] px-3 py-1 text-xs font-semibold text-[#2144b2]">
                  Apps Script API
                </span>
                <span className="inline-flex items-center rounded-full border border-[#dbe6ff] bg-[#f8faff] px-3 py-1 text-xs font-semibold text-[#2144b2]">
                  V1 Mock UI
                </span>
              </div>
            </div>
          </header>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
