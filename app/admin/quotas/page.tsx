"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type QuotaRow = {
  id: string;
  email: string;
  daily_count: number;
  total_count: number;
  daily_limit: number;
  total_limit: number;
  unlocked_by_admin: boolean;
  admin_unlocked_total: number;
  last_used_at: string | null;
};

export default function AdminQuotasPage() {
  const [email, setEmail] = useState("");
  const [quota, setQuota] = useState<QuotaRow | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!normalizedEmail) {
      setMessage("請輸入 Email。");
      return;
    }

    setIsLoading(true);
    setMessage("");
    setQuota(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("free_usage_quotas")
      .select(
        "id,email,daily_count,total_count,daily_limit,total_limit,unlocked_by_admin,admin_unlocked_total,last_used_at",
      )
      .eq("email", normalizedEmail)
      .maybeSingle();

    setIsLoading(false);

    if (error) {
      setMessage(`查詢失敗：${error.message}`);
      return;
    }

    if (!data) {
      setMessage("找不到這個 Email 的免費額度紀錄，可直接按下方按鈕建立並解鎖。");
      return;
    }

    setQuota(data as QuotaRow);
  };

  const handleUnlock = async () => {
    if (!normalizedEmail) {
      setMessage("請先輸入 Email。");
      return;
    }

    setIsLoading(true);
    setMessage("");

    const supabase = createClient();
    const nextUnlockedTotal = (quota?.admin_unlocked_total ?? 0) + 1;

    const payload = {
      email: normalizedEmail,
      unlocked_by_admin: true,
      admin_unlocked_total: nextUnlockedTotal,
      admin_note: "Unlocked from RAPID admin quotas page.",
      daily_limit: quota?.daily_limit ?? 2,
      total_limit: quota?.total_limit ?? 3,
    };

    const { data, error } = await supabase
      .from("free_usage_quotas")
      .upsert(payload, { onConflict: "email" })
      .select(
        "id,email,daily_count,total_count,daily_limit,total_limit,unlocked_by_admin,admin_unlocked_total,last_used_at",
      )
      .single();

    setIsLoading(false);

    if (error) {
      setMessage(`解鎖失敗：${error.message}`);
      return;
    }

    setQuota(data as QuotaRow);
    setMessage("已將該 Email 設為管理者解鎖，並增加一次手動贈送紀錄。");
  };

  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-blue-950/20">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
        Free Usage Quotas
      </p>
      <h2 className="mt-2 text-2xl font-semibold">免費額度管理</h2>

      <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-300/50"
          placeholder="輸入使用者 Email"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400 disabled:opacity-70"
        >
          搜尋
        </button>
        <button
          type="button"
          onClick={handleUnlock}
          disabled={isLoading}
          className="rounded-2xl border border-cyan-300/20 bg-cyan-500/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20 disabled:opacity-70"
        >
          解鎖並增加次數
        </button>
      </form>

      {message ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
          {message}
        </p>
      ) : null}

      {quota ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            ["Email", quota.email],
            ["Daily", `${quota.daily_count} / ${quota.daily_limit}`],
            ["Total", `${quota.total_count} / ${quota.total_limit}`],
            [
              "Admin Unlock",
              quota.unlocked_by_admin
                ? `true (+${quota.admin_unlocked_total})`
                : "false",
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {label}
              </p>
              <p className="mt-2 break-words text-sm text-slate-200">{value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
