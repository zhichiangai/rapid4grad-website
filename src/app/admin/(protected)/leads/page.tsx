'use client';

import { useMemo, useState } from 'react';
import { leadRows } from '@/lib/growth-dashboard';

const riskFilters = ['全部', '高風險', '中風險', '低風險'] as const;
const degreeFilters = ['全部', '碩士', '博士'] as const;

export default function LeadsPage() {
  const [query, setQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<(typeof riskFilters)[number]>('全部');
  const [degreeFilter, setDegreeFilter] = useState<(typeof degreeFilters)[number]>('全部');

  const rows = useMemo(() => {
    return leadRows.filter((row) => {
      const matchesQuery =
        `${row.name} ${row.email} ${row.school} ${row.department} ${row.primaryRisk} ${row.grade}`
          .toLowerCase()
          .includes(query.toLowerCase().trim());
      const matchesRisk = riskFilter === '全部' || row.riskLevel === riskFilter;
      const matchesDegree = degreeFilter === '全部' || row.degree === degreeFilter;
      return matchesQuery && matchesRisk && matchesDegree;
    });
  }, [degreeFilter, query, riskFilter]);

  return (
    <section className="grid gap-5">
      <article className="rounded-[36px] border border-white/70 bg-white/88 p-6 shadow-[0_20px_60px_rgba(16,32,58,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-bold tracking-[0.16em] text-[#2144b2]">Lead Dashboard</div>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#10203a]">名單總覽</h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#62708d]">這裡只看誰進來、誰完成診斷、誰最值得追，不做 CRM。</p>
          </div>
          <div className="rounded-[24px] border border-[#dbe6ff] bg-[#f8faff] px-4 py-3 text-sm font-semibold text-[#2144b2]">
            共 {rows.length} 筆符合條件
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1.5fr_0.75fr_0.75fr]">
          <label className="text-sm font-semibold text-[#1f3f9a]">
            搜尋
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="姓名 / Email / 學校 / 科系 / 卡點"
              className="mt-2 w-full rounded-2xl border border-[#d8e4ff] bg-white px-4 py-3 text-sm text-[#10203a] outline-none focus:border-[#2f62ef] focus:ring-4 focus:ring-[#2f62ef1f]"
            />
          </label>
          <label className="text-sm font-semibold text-[#1f3f9a]">
            風險等級
            <select
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value as (typeof riskFilters)[number])}
              className="mt-2 w-full rounded-2xl border border-[#d8e4ff] bg-white px-4 py-3 text-sm text-[#10203a] outline-none focus:border-[#2f62ef] focus:ring-4 focus:ring-[#2f62ef1f]"
            >
              {riskFilters.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-[#1f3f9a]">
            學位
            <select
              value={degreeFilter}
              onChange={(event) => setDegreeFilter(event.target.value as (typeof degreeFilters)[number])}
              className="mt-2 w-full rounded-2xl border border-[#d8e4ff] bg-white px-4 py-3 text-sm text-[#10203a] outline-none focus:border-[#2f62ef] focus:ring-4 focus:ring-[#2f62ef1f]"
            >
              {degreeFilters.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </article>

      <article className="overflow-hidden rounded-[36px] border border-white/70 bg-white/88 shadow-[0_20px_60px_rgba(16,32,58,0.08)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f5f8ff] text-xs uppercase tracking-[0.12em] text-[#6a7a97]">
              <tr>
                {['姓名', 'Email', '學校', '科系', '碩博', '年級', '風險', '最大問題', '診斷日期'].map((head) => (
                  <th key={head} className="px-5 py-4 font-bold">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.email} className="border-t border-[#eef2ff]">
                  <td className="px-5 py-4 font-semibold text-[#10203a]">{row.name}</td>
                  <td className="px-5 py-4 text-[#62708d]">{row.email}</td>
                  <td className="px-5 py-4 text-[#62708d]">{row.school}</td>
                  <td className="px-5 py-4 text-[#62708d]">{row.department}</td>
                  <td className="px-5 py-4 text-[#62708d]">{row.degree}</td>
                  <td className="px-5 py-4 text-[#62708d]">{row.grade}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-full bg-[#f5f8ff] px-3 py-1 text-xs font-bold text-[#2144b2]">{row.riskLevel}</span>
                  </td>
                  <td className="px-5 py-4 text-[#20304b]">{row.primaryRisk}</td>
                  <td className="px-5 py-4 text-[#62708d]">{row.diagnosisDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
