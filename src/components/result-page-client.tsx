'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { DIAGNOSIS_STORAGE_KEY } from '@/lib/site';
import { getDegreeLabel, getStageLabel, type DiagnosisFormInput, type DiagnosisResult } from '@/lib/diagnosis';
import { SiteShell } from '@/components/site-shell';

type Snapshot = {
  input: DiagnosisFormInput;
  result: DiagnosisResult;
  savedAt: string;
};

async function fetchLeadByToken(token: string) {
  const response = await fetch(`/api/diagnosis?token=${encodeURIComponent(token)}`);
  return response.json();
}

export function ResultPageClient({ token }: { token: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const riskStyle = useMemo(() => {
    const riskLevel = snapshot?.result.riskLevel || 'low';
    if (riskLevel === 'critical') return 'border-[#efc2cf] bg-[#fff4f8] text-[#b23d66]';
    if (riskLevel === 'high') return 'border-[#f0d8ad] bg-[#fffaf1] text-[#9f641a]';
    if (riskLevel === 'medium') return 'border-[#c9dcff] bg-[#f5f8ff] text-[#1f3f9a]';
    return 'border-[#cde9de] bg-[#f4fff8] text-[#1d7b52]';
  }, [snapshot]);

  useEffect(() => {
    const saved = window.localStorage.getItem(DIAGNOSIS_STORAGE_KEY);
    const parse = (value: string | null) => {
      if (!value) return null;
      try {
        return JSON.parse(value) as Snapshot;
      } catch {
        return null;
      }
    };

    const localSnapshot = parse(saved);
    if (localSnapshot) {
      setSnapshot(localSnapshot);
    }

    async function loadRemote() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const result = await fetchLeadByToken(token);
        if (result.ok && result.lead) {
          const remoteSnapshot: Snapshot = {
            input: result.input,
            result: result.result,
            savedAt: result.savedAt || new Date().toISOString()
          };
          setSnapshot(remoteSnapshot);
          window.localStorage.setItem(DIAGNOSIS_STORAGE_KEY, JSON.stringify(remoteSnapshot));
        }
      } finally {
        setLoading(false);
      }
    }

    loadRemote().catch(() => setLoading(false));
  }, [token]);

  return (
    <SiteShell>
      <section className="grid gap-6 lg:grid-cols-[1.06fr_0.94fr]">
        <article className="relative overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(140deg,#315ef6_0%,#2144b2_52%,#122a79_100%)] p-7 text-white shadow-[0_28px_60px_rgba(13,35,103,0.26)] sm:p-10 lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.14),transparent_22%),radial-gradient(circle_at_78%_20%,rgba(139,180,255,0.16),transparent_18%),radial-gradient(circle_at_76%_80%,rgba(8,18,57,0.18),transparent_24%)]" />
          <div className="relative">
            <div className="inline-flex rounded-full border border-white/18 bg-white/12 px-4 py-1 text-xs font-semibold tracking-[0.16em] text-white/92">
              診斷結果
            </div>

            {loading && !snapshot ? (
              <div className="mt-5 text-white/80">正在讀取你的診斷結果...</div>
            ) : snapshot ? (
              <>
                <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[0.92] tracking-tight sm:text-5xl lg:text-6xl">
                  {snapshot.input.name}，這是你目前的研究狀態。
                </h1>
                <p className="mt-5 max-w-2xl text-[17px] leading-8 text-white/84">{snapshot.result.summary}</p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                    <div className="text-xs font-bold text-white/72">身份</div>
                    <div className="mt-2 text-lg font-extrabold text-white">{getDegreeLabel(snapshot.input.degree_type)}</div>
                  </div>
                  <div className="rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                    <div className="text-xs font-bold text-white/72">研究階段</div>
                    <div className="mt-2 text-lg font-extrabold text-white">{getStageLabel(snapshot.input.current_stage)}</div>
                  </div>
                </div>

                <div className={`mt-6 inline-flex rounded-full border px-4 py-2 text-sm font-bold ${riskStyle}`}>
                  風險等級：{snapshot.result.riskLevel.toUpperCase()} · 分數 {snapshot.result.riskScore}
                </div>

                <div className="mt-8 grid gap-3">
                  {snapshot.result.nextSteps.map((step, index) => (
                    <div key={step} className="rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                      <div className="text-xs font-bold text-white/72">下一步 {index + 1}</div>
                      <div className="mt-2 text-base font-semibold text-white">{step}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-[24px] border border-white/12 bg-white/10 p-4 text-white/84">
                找不到你的診斷結果。請先回到診斷頁完成表單。
              </div>
            )}
          </div>
        </article>

        <aside className="grid gap-4">
          <div className="rounded-[34px] border border-[#dbe6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f6f8ff_100%)] p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
            <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-bold tracking-[0.12em] text-[#2144b2]">
              接下來
            </div>
            <div className="mt-5 grid gap-3">
              {[
                '你會收到歡迎信與結果摘要',
                '你可以直接去 Dashboard 看今天要做什麼',
                '我們會把你的狀況寫入 Google Sheet，方便後續追蹤'
              ].map((text, index) => (
                <div key={text} className="rounded-[24px] border border-[#dbe6ff] bg-white p-4 shadow-[0_10px_18px_rgba(18,39,92,0.04)]">
                  <div className="text-xs font-bold text-[#2860f2]">0{index + 1}</div>
                  <p className="mt-2 text-[15px] leading-7 text-[#20304b]">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[34px] border border-[#dbe6ff] bg-white p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
            <div className="text-sm font-bold text-[#2144b2]">推薦資源</div>
            <div className="mt-4 grid gap-3">
              {snapshot?.result.resources.map((resource) => (
                <Link
                  key={resource.label}
                  href={resource.href}
                  className="rounded-[24px] border border-[#dbe6ff] bg-[#f8faff] p-4 transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <div className="font-semibold text-[#10203a]">{resource.label}</div>
                  <p className="mt-1 text-sm leading-6 text-[#62708d]">{resource.description}</p>
                </Link>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={snapshot ? snapshot.result.dashboardUrl : '/dashboard'}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#315ef6,#2144b2)] px-5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(33,68,178,0.2)]"
              >
                前往 Dashboard
              </Link>
              <Link
                href="/tools"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#dbe6ff] bg-white px-5 text-sm font-bold text-[#2144b2]"
              >
                再看 Free Tools
              </Link>
              <Link
                href="/diagnosis"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#dbe6ff] bg-white px-5 text-sm font-bold text-[#2144b2]"
              >
                重新診斷
              </Link>
            </div>
          </div>
        </aside>
      </section>
    </SiteShell>
  );
}
