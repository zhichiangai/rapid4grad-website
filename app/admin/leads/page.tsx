"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type LeadStatus = "new" | "contacted" | "consulted" | "purchased" | "not_fit";

type LeadRow = {
  id: string;
  name: string | null;
  email: string;
  quiz_result: "low" | "medium" | "high" | null;
  quiz_score: number | null;
  main_tags: string[] | null;
  lead_status: LeadStatus;
  created_at: string;
};

const leadStatuses: LeadStatus[] = [
  "new",
  "contacted",
  "consulted",
  "purchased",
  "not_fit",
];

const riskLabels = {
  low: "低",
  medium: "中",
  high: "高",
} as const;

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadLeads() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("leads")
        .select(
          "id,name,email,quiz_result,quiz_score,main_tags,lead_status,created_at",
        )
        .order("created_at", { ascending: false });

      if (error) {
        setMessage(`讀取失敗：${error.message}`);
      } else {
        setLeads((data ?? []) as LeadRow[]);
      }

      setIsLoading(false);
    }

    void loadLeads();
  }, []);

  const handleStatusChange = async (leadId: string, status: LeadStatus) => {
    const supabase = createClient();
    setMessage("");

    const { error } = await supabase
      .from("leads")
      .update({ lead_status: status })
      .eq("id", leadId);

    if (error) {
      setMessage(`更新失敗：${error.message}`);
      return;
    }

    setLeads((current) =>
      current.map((lead) =>
        lead.id === leadId ? { ...lead, lead_status: status } : lead,
      ),
    );
    setMessage("Lead 狀態已更新。");
  };

  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-blue-950/20">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
            Lead Funnel
          </p>
          <h2 className="mt-2 text-2xl font-semibold">問卷名單管理</h2>
        </div>
        <p className="text-sm text-slate-400">
          {isLoading ? "讀取中..." : `${leads.length} 筆名單`}
        </p>
      </div>

      {message ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
          {message}
        </p>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.18em] text-slate-400">
            <tr>
              <th className="px-4 py-3">姓名</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">風險</th>
              <th className="px-4 py-3">分數</th>
              <th className="px-4 py-3">標籤</th>
              <th className="px-4 py-3">狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {leads.map((lead) => (
              <tr key={lead.id} className="align-top">
                <td className="px-4 py-4 text-slate-200">
                  {lead.name || "未填"}
                </td>
                <td className="px-4 py-4 font-mono text-xs text-blue-100">
                  {lead.email}
                </td>
                <td className="px-4 py-4 text-slate-300">
                  {lead.quiz_result ? riskLabels[lead.quiz_result] : "-"}
                </td>
                <td className="px-4 py-4 text-slate-300">
                  {lead.quiz_score ?? "-"}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    {(lead.main_tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-blue-300/20 bg-blue-500/10 px-2 py-1 text-xs text-blue-100"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <select
                    value={lead.lead_status}
                    onChange={(event) =>
                      void handleStatusChange(
                        lead.id,
                        event.target.value as LeadStatus,
                      )
                    }
                    className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
                  >
                    {leadStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
