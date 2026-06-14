'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DIAGNOSIS_STORAGE_KEY } from '@/lib/site';
import { type DiagnosisFormInput, type DiagnosisResult } from '@/lib/diagnosis';
import { SiteShell } from '@/components/site-shell';

type Snapshot = {
  input: DiagnosisFormInput;
  result: DiagnosisResult;
  savedAt: string;
};

const sampleResult = {
  riskLevel: '中風險',
  mainReason: 'Meeting 不固定',
  suggestions: ['固定每週 Meeting', '建立論文時程表', '完成文獻整理']
};

export function ResultPageClient({ token: _token }: { token: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = window.localStorage.getItem(DIAGNOSIS_STORAGE_KEY);
    if (!saved) {
      setLoading(false);
      return;
    }

    try {
      setSnapshot(JSON.parse(saved) as Snapshot);
    } catch {
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

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
                  {snapshot.input.name || '你'}，我先幫你整理好了。
                </h1>
                <p className="mt-5 max-w-2xl text-[17px] leading-8 text-white/84">
                  你今天先做這件事就好，其他先放著。
                </p>

                <div className="mt-8 rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur">
                  <div className="text-xs font-bold text-white/72">今天先做</div>
                  <div className="mt-2 text-2xl font-black text-white">{snapshot.result.nextSteps[0]}</div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                    <div className="text-xs font-bold text-white/72">下一步</div>
                    <div className="mt-2 text-base font-semibold text-white">{snapshot.result.nextSteps[1]}</div>
                  </div>
                  <div className="rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                    <div className="text-xs font-bold text-white/72">這週目標</div>
                    <div className="mt-2 text-base font-semibold text-white">{snapshot.result.nextSteps[2]}</div>
                  </div>
                </div>

                <div className="mt-6 rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                  <div className="text-xs font-bold text-white/72">每週回來更新</div>
                  <p className="mt-2 text-sm leading-7 text-white/84">
                    下週把你完成的內容帶回來更新一次，RAPID 會重新計算風險與下一步。這樣你每週都會看到新的結果，而不是重複同一份摘要。
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="mt-5 rounded-[24px] border border-white/12 bg-white/10 p-4 text-white/84">
                  你還沒做診斷，我先用範例給你看你會拿到什麼。
                </div>
                <div className="mt-4 rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur">
                  <div className="text-xs font-bold text-white/72">範例版結果</div>
                  <div className="mt-2 text-2xl font-black text-white">今天先做：{sampleResult.suggestions[0]}</div>
                  <p className="mt-3 text-sm leading-7 text-white/84">下一步：{sampleResult.suggestions[1]}</p>
                  <div className="mt-4 grid gap-2">
                    {sampleResult.suggestions.map((item) => (
                      <div key={item} className="rounded-2xl bg-white/10 p-3 text-sm text-white/84">
                        {item}
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs font-semibold text-white/70">完成診斷後，這裡會換成你的資料。</p>
                </div>
              </>
            )}
          </div>
        </article>

        <aside className="grid gap-4">
          <div className="rounded-[34px] border border-[#dbe6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f6f8ff_100%)] p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
            <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-bold tracking-[0.12em] text-[#2144b2]">
              今天先做
            </div>
            <div className="mt-5 rounded-[24px] border border-[#dbe6ff] bg-white p-4 shadow-[0_10px_18px_rgba(18,39,92,0.04)]">
              <p className="text-[15px] leading-7 text-[#20304b]">
                {snapshot?.result.nextSteps[0] || sampleResult.suggestions[0]}
              </p>
            </div>
            <div className="mt-4 rounded-[24px] border border-[#dbe6ff] bg-white p-4 shadow-[0_10px_18px_rgba(18,39,92,0.04)]">
              <div className="text-xs font-bold text-[#2860f2]">下一步</div>
              <p className="mt-2 text-[15px] leading-7 text-[#20304b]">
                {snapshot?.result.nextSteps[1] || sampleResult.suggestions[1]}
              </p>
            </div>
            <div className="mt-4 rounded-[24px] border border-[#dbe6ff] bg-white p-4 shadow-[0_10px_18px_rgba(18,39,92,0.04)]">
              <div className="text-xs font-bold text-[#2860f2]">這週目標</div>
              <p className="mt-2 text-[15px] leading-7 text-[#20304b]">
                {snapshot?.result.nextSteps[2] || sampleResult.suggestions[2]}
              </p>
            </div>
          </div>

          <div className="rounded-[34px] border border-[#dbe6ff] bg-white p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
            <div className="text-sm font-bold text-[#2144b2]">推薦資源</div>
            <div className="mt-4 grid gap-3">
              {(snapshot?.result.resources || []).map((resource) => (
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
                前往 Dashboard 看今天任務
              </Link>
              <Link
                href="/diagnosis"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#dbe6ff] bg-white px-5 text-sm font-bold text-[#2144b2]"
              >
                回去做診斷
              </Link>
            </div>
          </div>
        </aside>
      </section>
    </SiteShell>
  );
}
