"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";
import { isSafeNextPath } from "@/lib/workspace/access";
import { createClient } from "@/lib/supabase/client";

const GENERIC_SUCCESS = "如果這個 Email 已註冊，我們會寄出密碼重設信。請檢查收件匣與垃圾郵件。";
const GENERIC_ERROR = "目前無法寄送密碼重設信，請稍後再試。";

function getSafeNextPath() {
  const raw = new URLSearchParams(window.location.search).get("next");
  return isSafeNextPath(raw) ? raw : null;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");
    setError("");

    try {
      const redirectTo = new URL("/auth/callback", window.location.origin);
      redirectTo.searchParams.set("flow", "recovery");
      const nextPath = getSafeNextPath();
      if (nextPath) redirectTo.searchParams.set("next", nextPath);
      const { error: resetError } = await createClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectTo.toString(),
      });

      if (resetError) {
        console.warn("[auth/forgot-password] resetPasswordForEmail failed", {
          operation: "resetPasswordForEmail",
          status: 400,
          code: resetError.code ?? "unknown",
        });
      }
      setMessage(GENERIC_SUCCESS);
    } catch {
      console.warn("[auth/forgot-password] reset request failed", {
        operation: "resetPasswordForEmail",
        status: 500,
        code: "unexpected_error",
      });
      setError(GENERIC_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-white">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/20 sm:p-8">
        <p className="text-sm font-semibold tracking-[0.28em] text-cyan-300">RAPID4GRAD</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">忘記密碼</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">輸入註冊 Email，我們會寄出密碼重設信。</p>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-200" htmlFor="forgot-password-email">
            Email
            <input id="forgot-password-email" name="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30" placeholder="name@example.com" />
          </label>
          <button type="submit" disabled={isLoading} className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60">{isLoading ? "寄送中..." : "寄送重設密碼信"}</button>
        </form>
        {error ? <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
        {message ? <p role="status" className="mt-5 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">{message}</p> : null}
        <p className="mt-6 text-center text-sm"><Link className="font-semibold text-cyan-300 hover:text-cyan-200" href="/login">返回登入</Link></p>
      </section>
    </main>
  );
}
