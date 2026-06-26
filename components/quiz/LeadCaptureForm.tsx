"use client";

import { FormEvent, useState } from "react";

interface LeadCaptureFormProps {
  onSuccess: (leadId: string, email: string) => void;
}

interface LeadResponse {
  leadId?: string;
  error?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LeadCaptureForm({ onSuccess }: LeadCaptureFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedEmail = email.trim().toLowerCase();
  const isEmailValid = EMAIL_PATTERN.test(trimmedEmail);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isEmailValid) {
      setError("請輸入有效的 Email，才能開始檢查。");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim() || null,
          email: trimmedEmail,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as LeadResponse;

      if (!response.ok || !data.leadId) {
        throw new Error(data.error ?? "名單建立失敗，請稍後再試。");
      }

      onSuccess(data.leadId, trimmedEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "系統暫時無法送出表單。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-xl rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-blue-950/20 backdrop-blur sm:p-8">
      <div className="mb-7 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">
          RAPID4GRAD CHECK
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          先留下 Email，開始研究生畢業狀態檢查
        </h2>
        <p className="text-sm leading-6 text-slate-400">
          這份 7 題檢查會幫你快速判斷目前卡關位置，完成後會顯示風險等級與下一步建議。
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <label htmlFor="lead-name" className="text-sm font-medium text-slate-200">
            姓名 <span className="text-slate-500">（選填）</span>
          </label>
          <input
            id="lead-name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            disabled={isSubmitting}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：王小明"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="lead-email" className="text-sm font-medium text-slate-200">
            Email <span className="text-blue-300">（必填）</span>
          </label>
          <input
            id="lead-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            disabled={isSubmitting}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            aria-invalid={Boolean(error && !isEmailValid)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        {error ? (
          <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center rounded-2xl bg-blue-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-blue-500/50 disabled:shadow-none"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              建立檢查中...
            </span>
          ) : (
            "開始畢業狀態檢查"
          )}
        </button>

        <p className="text-center text-xs leading-5 text-slate-500">
          我們只會用 Email 寄送結果備份與研究生畢業避坑指南。
        </p>
      </form>
    </section>
  );
}
