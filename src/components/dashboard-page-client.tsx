'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DIAGNOSIS_STORAGE_KEY } from '@/lib/site';
import { SiteShell } from '@/components/site-shell';
import { getDegreeLabel, getStageLabel, type DiagnosisFormInput, type DiagnosisResult } from '@/lib/diagnosis';

type Snapshot = {
  input: DiagnosisFormInput;
  result: DiagnosisResult;
  savedAt: string;
};

async function fetchLead(token: string) {
  const response = await fetch(`/api/diagnosis?token=${encodeURIComponent(token)}`);
  return response.json();
}

export function DashboardPageClient({ token }: { token: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storage = window.localStorage.getItem(DIAGNOSIS_STORAGE_KEY);
    if (storage) {
      try {
        setSnapshot(JSON.parse(storage) as Snapshot);
      } catch {
        // ignore parse errors
      }
    }

    async function load() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetchLead(token);
        if (response.ok && response.lead) {
          const remoteSnapshot: Snapshot = {
            input: response.input,
            result: response.result,
            savedAt: response.savedAt || new Date().toISOString()
          };
          setSnapshot(remoteSnapshot);
        }
      } finally {
        setLoading(false);
      }
    }

    load().catch(() => setLoading(false));
  }, [token]);

  const input = snapshot?.input;
  const result = snapshot?.result;

  return (
    <SiteShell>
      <section className="grid gap-6 lg:grid-cols-[1.06fr_0.94fr]">
        <article className="relative overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(140deg,#315ef6_0%,#2144b2_52%,#122a79_100%)] p-7 text-white shadow-[0_28px_60px_rgba(13,35,103,0.26)] sm:p-10 lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.14),transparent_22%),radial-gradient(circle_at_78%_18%,rgba(139,180,255,0.16),transparent_18%),radial-gradient(circle_at_76%_82%,rgba(8,18,57,0.18),transparent_24%)]" />
          <div className="relative">
            <div className="inline-flex rounded-full border border-white/18 bg-white/12 px-4 py-1 text-xs font-semibold tracking-[0.16em] text-white/92">
              Dashboard
            </div>
            {loading && !snapshot ? (
              <div className="mt-5 text-white/80">正在載入你的 Dashboard...</div>
            ) : snapshot ? (
              <>
                <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[0.92] tracking-tight sm:text-5xl lg:text-6xl">
                  歡迎回來，{input?.name || '研究生'}
                </h1>
                <p className="mt-5 max-w-2xl text-[17px] leading-8 text-white/84">
                  這裡會持續顯示你今天最該先做什麼，讓你的研究進度不是散掉，而是被整理成一條可執行的路線。
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                    <div className="text-xs font-bold text-white/72">身份</div>
                    <div className="mt-2 text-lg font-extrabold text-white">{input ? getDegreeLabel(input.degree_type) : '未填寫'}</div>
                  </div>
                  <div className="rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                    <div className="text-xs font-bold text-white/72">研究階段</div>
                    <div className="mt-2 text-lg font-extrabold text-white">{input ? getStageLabel(input.current_stage) : '未填寫'}</div>
                  </div>
                  <div className="rounded-[24px] border border-white/12 bg-white/10 p-4 sm:col-span-2 backdrop-blur">
                    <div className="text-xs font-bold text-white/72">目前最大問題</div>
                    <div className="mt-2 text-lg font-semibold text-white">{input?.current_blocker || '尚未填寫'}</div>
                  </div>
                </div>

                <div className="mt-8 grid gap-3">
                  <div className="rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                    <div className="text-sm font-bold text-white">今日任務</div>
                    <ul className="mt-3 grid gap-2 text-sm leading-6 text-white/82">
                      {(result?.todayTasks || []).map((task) => (
                        <li key={task} className="rounded-2xl bg-white/10 p-3">
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                    <div className="text-sm font-bold text-white">本週任務</div>
                    <ul className="mt-3 grid gap-2 text-sm leading-6 text-white/82">
                      {(result?.weeklyTasks || []).map((task) => (
                        <li key={task} className="rounded-2xl bg-white/10 p-3">
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-[24px] border border-white/12 bg-white/10 p-4 text-white/84">
                目前沒有你的資料。請先完成診斷，或使用結果頁提供的 token 連回來。
              </div>
            )}
          </div>
        </article>

        <aside className="grid gap-4">
          <div className="rounded-[34px] border border-[#dbe6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f6f8ff_100%)] p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
            <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-bold tracking-[0.12em] text-[#2144b2]">
              Free Tools
            </div>
            <div className="mt-4 text-lg font-extrabold text-[#10203a]">先看風險，再做下一步</div>
            <p className="mt-2 text-sm leading-7 text-[#62708d]">
              如果你還沒準備好進診斷，可以先用三個免費工具快速看見價值。
            </p>
            <Link
              href="/tools"
              className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#315ef6,#2144b2)] px-5 text-sm font-bold text-white"
            >
              打開 Free Tools
            </Link>
          </div>

          <div className="rounded-[34px] border border-[#dbe6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f6f8ff_100%)] p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
            <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-bold tracking-[0.12em] text-[#2144b2]">
              推薦資源
            </div>
            <div className="mt-5 grid gap-3">
              {(result?.resources || []).map((resource) => (
                <Link
                  key={resource.label}
                  href={resource.href}
                  className="rounded-[24px] border border-[#dbe6ff] bg-white p-4 transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <div className="font-semibold text-[#10203a]">{resource.label}</div>
                  <p className="mt-1 text-sm leading-6 text-[#62708d]">{resource.description}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[34px] border border-[#dbe6ff] bg-white p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
            <div className="text-sm font-bold text-[#2144b2]">目前風險</div>
            <div className="mt-4 inline-flex rounded-full bg-[#f5f8ff] px-4 py-2 text-sm font-bold text-[#1f3f9a]">
              {result?.riskLevel?.toUpperCase() || 'UNKNOWN'} · {result?.riskScore ?? 0}
            </div>

            <div className="mt-6 rounded-[24px] bg-[#f8faff] p-4">
              <div className="text-sm font-bold text-[#2144b2]">建議你今天先做</div>
              <div className="mt-2 text-sm leading-7 text-[#62708d]">
                先處理第一個任務，今天只要把進度推進一小步即可。
              </div>
            </div>
          </div>
        </aside>
      </section>
    </SiteShell>
  );
}
