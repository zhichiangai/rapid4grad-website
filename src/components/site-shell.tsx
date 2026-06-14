import Link from 'next/link';
import type { ReactNode } from 'react';
import { SITE_NAME } from '@/lib/site';

const navLinks = [
  { href: '/tools', label: 'Free Tools' },
  { href: '/diagnosis', label: '免費診斷' },
  { href: '/result', label: '結果頁' },
  { href: '/dashboard', label: 'Dashboard' }
];

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-[#10203a]">
      <header className="sticky top-0 z-50 border-b border-white/12 bg-[#1f3f9a]/95 shadow-[0_16px_38px_rgba(11,31,93,0.22)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-[min(1240px,calc(100%-20px))] items-center justify-between gap-4 sm:w-[min(1240px,calc(100%-32px))]">
          <Link href="/" className="inline-flex items-center gap-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[15px] font-black text-[#1f3f9a] shadow-[0_10px_18px_rgba(3,15,58,0.18)]">
              R
            </span>
            <span className="text-[17px] font-extrabold tracking-[0.01em]">{SITE_NAME}</span>
          </Link>

          <nav className="flex items-center gap-1 overflow-x-auto whitespace-nowrap text-sm text-white/90">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex min-h-9 flex-none items-center rounded-full px-3.5 font-semibold transition hover:bg-white/12 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/diagnosis"
              className="inline-flex min-h-9 flex-none items-center rounded-full bg-white px-3.5 font-semibold text-[#1f3f9a] shadow-[0_10px_18px_rgba(3,15,58,0.12)]"
            >
              立即診斷
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-[min(1240px,calc(100%-20px))] flex-col py-5 sm:w-[min(1240px,calc(100%-32px))] sm:py-7">
        <main className="flex-1">{children}</main>

        <footer className="mt-8 border-t border-[#cad8ff] pt-5 text-sm text-[#53607c]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <strong className="block text-[#10203a]">{SITE_NAME}</strong>
              <p>研究生畢業導航系統。先診斷，再提供下一步。</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link href="/tools" className="font-semibold text-[#1f3f9a]">
                Free Tools
              </Link>
              <Link href="/testimonials" className="font-semibold text-[#1f3f9a]">
                回饋
              </Link>
              <Link href="/thesis-writing" className="font-semibold text-[#1f3f9a]">
                AI 工具
              </Link>
              <Link href="/policies" className="font-semibold text-[#1f3f9a]">
                政策條款
              </Link>
              <Link href="/diagnosis" className="font-semibold text-[#1f3f9a]">
                免費診斷
              </Link>
              <Link href="/result" className="font-semibold text-[#1f3f9a]">
                結果頁
              </Link>
              <Link href="/dashboard" className="font-semibold text-[#1f3f9a]">
                Dashboard
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
