'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ADMIN_SESSION_KEY } from '@/lib/growth-dashboard';

const DEMO_ADMIN_EMAIL = 'admin@rapid4grad.com';
const DEMO_ADMIN_PASSWORD = 'rapid2026';

export function AdminLoginClient({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const hints = useMemo(
    () => [
      '這是內部 Growth Dashboard，不是公開會員登入。',
      '先看漏斗，再看名單，再看內容效果。',
      '目前資料來源預設是 Google Sheet / Apps Script。'
    ],
    []
  );

  useEffect(() => {
    const raw = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (raw) {
      router.replace(nextPath);
    }
  }, [nextPath, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '').trim();

    if (email !== DEMO_ADMIN_EMAIL || password !== DEMO_ADMIN_PASSWORD) {
      setError('帳號或密碼不正確，請確認後再試一次。');
      setLoading(false);
      return;
    }

    window.sessionStorage.setItem(
      ADMIN_SESSION_KEY,
      JSON.stringify({
        email,
        name: 'RAPID Growth Admin',
        signedInAt: new Date().toISOString()
      })
    );

    router.replace(nextPath);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#315ef61f,transparent_30%),radial-gradient(circle_at_top_right,#2144b226,transparent_24%),linear-gradient(180deg,#f5f8ff_0%,#eef3ff_100%)] text-[#10203a]">
      <div className="mx-auto grid min-h-screen w-[min(1280px,calc(100%-24px))] items-center gap-6 py-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden rounded-[40px] border border-white/70 bg-[linear-gradient(140deg,#315ef6_0%,#2144b2_52%,#122a79_100%)] p-8 text-white shadow-[0_32px_70px_rgba(13,35,103,0.26)] sm:p-10 lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.16),transparent_20%),radial-gradient(circle_at_82%_20%,rgba(160,194,255,0.2),transparent_18%),radial-gradient(circle_at_68%_82%,rgba(8,18,57,0.24),transparent_24%)]" />
          <div className="relative">
            <div className="inline-flex rounded-full border border-white/16 bg-white/12 px-4 py-1 text-xs font-semibold tracking-[0.16em] text-white/90">
              RAPID Growth Dashboard V1
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[0.92] tracking-tight sm:text-5xl lg:text-6xl">
              先看哪裡卡住，再決定要做什麼。
            </h1>
            <p className="mt-5 max-w-2xl text-[17px] leading-8 text-white/84">
              這個後台不是 CRM，也不是資料倉庫。它只做一件事：讓你一眼看出漏斗哪裡掉人、哪些名單最值得看、哪個內容最有效。
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ['今日訪客', '1,284'],
                ['本週診斷', '312'],
                ['累積名單', '6,421']
              ].map(([label, value]) => (
                <div key={label} className="rounded-[26px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                  <div className="text-xs font-semibold tracking-[0.14em] text-white/72">{label}</div>
                  <div className="mt-2 text-2xl font-black text-white">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3">
              {hints.map((hint) => (
                <div key={hint} className="rounded-[24px] border border-white/12 bg-white/10 p-4 text-sm leading-7 text-white/86 backdrop-blur">
                  {hint}
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-3 text-sm font-semibold text-white/88">
              <span className="rounded-full border border-white/16 bg-white/10 px-4 py-2">Funnels</span>
              <span className="rounded-full border border-white/16 bg-white/10 px-4 py-2">Leads</span>
              <span className="rounded-full border border-white/16 bg-white/10 px-4 py-2">Insights</span>
              <span className="rounded-full border border-white/16 bg-white/10 px-4 py-2">Content Analytics</span>
            </div>
          </div>
        </section>

        <section className="rounded-[40px] border border-white/70 bg-white/84 p-6 shadow-[0_28px_60px_rgba(16,32,58,0.1)] backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-bold tracking-[0.14em] text-[#2144b2]">
            後台登入
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-[#10203a]">登入後直接看 Growth Dashboard</h2>
          <p className="mt-3 text-[15px] leading-7 text-[#62708d]">
            先看漏斗，再看名單，再看內容效果。不要先碰 CRM，也不要先整理複雜表單。
          </p>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <label className="text-sm font-semibold text-[#1f3f9a]">
              管理員 Email
              <input
                name="email"
                type="email"
                defaultValue={DEMO_ADMIN_EMAIL}
                className="mt-2 w-full rounded-2xl border border-[#d8e4ff] bg-white px-4 py-3 text-sm text-[#10203a] outline-none transition placeholder:text-[#97a6c9] focus:border-[#2f62ef] focus:ring-4 focus:ring-[#2f62ef1f]"
              />
            </label>
            <label className="text-sm font-semibold text-[#1f3f9a]">
              管理密碼
              <input
                name="password"
                type="password"
                defaultValue={DEMO_ADMIN_PASSWORD}
                className="mt-2 w-full rounded-2xl border border-[#d8e4ff] bg-white px-4 py-3 text-sm text-[#10203a] outline-none transition placeholder:text-[#97a6c9] focus:border-[#2f62ef] focus:ring-4 focus:ring-[#2f62ef1f]"
              />
            </label>

            {error ? <div className="rounded-2xl border border-[#f2c4d3] bg-[#fff3f7] px-4 py-3 text-sm font-semibold text-[#b23d66]">{error}</div> : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#315ef6,#2144b2)] px-6 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(33,68,178,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? '登入中...' : '進入 Growth Dashboard'}
            </button>
          </form>

          <div className="mt-6 grid gap-3 rounded-[28px] border border-[#dbe6ff] bg-[#f8faff] p-4">
            <div className="text-xs font-bold tracking-[0.14em] text-[#2144b2]">這個後台先看什麼</div>
            <div className="grid gap-2 text-sm leading-7 text-[#20304b]">
              <div>1. 漏斗哪一段流失最多</div>
              <div>2. 哪些名單最有可能轉換</div>
              <div>3. 哪個內容最值得繼續做</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#dbe6ff] bg-white px-4 text-sm font-bold text-[#2144b2]">
              回前台
            </Link>
            <Link href="/admin/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#dbe6ff] bg-white px-4 text-sm font-bold text-[#2144b2]">
              先看示意後台
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
