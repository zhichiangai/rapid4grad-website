import { updateLeadStatus } from "../actions";
import { createClient } from "@/lib/supabase/server";
import type { LeadStatus, RiskLevel } from "@/types/database";

type AdminLeadsSearchParams = Promise<{
  message?: string;
}>;

type LeadRow = {
  id: string;
  name: string | null;
  email: string;
  quiz_result: RiskLevel | null;
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

const riskLabels: Record<RiskLevel, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

const statusLabels: Record<LeadStatus, string> = {
  new: "new",
  contacted: "contacted",
  consulted: "consulted",
  purchased: "purchased",
  not_fit: "not_fit",
};

function resolveMessage(message?: string) {
  if (!message) return "";

  if (message === "lead-status-updated") {
    return "Lead 狀態已更新。";
  }

  if (message === "invalid-lead-status") {
    return "Lead ID 或狀態不合法。";
  }

  return decodeURIComponent(message);
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: AdminLeadsSearchParams;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id,name,email,quiz_result,quiz_score,main_tags,lead_status,created_at",
    )
    .order("created_at", { ascending: false });

  const leads = (data ?? []) as LeadRow[];
  const message = error?.message ?? resolveMessage(params.message);

  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-blue-950/20">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
            Lead Funnel
          </p>
          <h2 className="mt-2 text-2xl font-semibold">問卷名單管理</h2>
        </div>
        <p className="text-sm text-slate-400">{leads.length} 筆名單</p>
      </div>

      {message ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
          {message}
        </p>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.18em] text-slate-400">
            <tr>
              <th className="px-4 py-3">姓名</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">風險</th>
              <th className="px-4 py-3">分數</th>
              <th className="px-4 py-3">標籤</th>
              <th className="px-4 py-3">狀態</th>
              <th className="px-4 py-3">建立時間</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {leads.length ? (
              leads.map((lead) => (
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
                      {(lead.main_tags ?? []).length ? (
                        (lead.main_tags ?? []).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-blue-300/20 bg-blue-500/10 px-2 py-1 text-xs text-blue-100"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">無標籤</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <form action={updateLeadStatus} className="flex gap-2">
                      <input type="hidden" name="leadId" value={lead.id} />
                      <select
                        name="leadStatus"
                        defaultValue={lead.lead_status}
                        className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
                      >
                        {leadStatuses.map((status) => (
                          <option key={status} value={status}>
                            {statusLabels[status]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-xl bg-blue-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-400"
                      >
                        更新
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500">
                    {new Date(lead.created_at).toLocaleString("zh-TW")}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  目前沒有 Lead 資料。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
