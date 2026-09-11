"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const INVALID_RECOVERY = "這個密碼重設連結已失效，請重新申請。";
const GENERIC_ERROR = "無法更新密碼，請重新申請密碼重設信。";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let active = true;
    const verifyRecoverySession = async () => {
      const queryError = new URLSearchParams(window.location.search).get("error");
      if (queryError === "invalid_recovery") {
        if (active) setErrorMessage(INVALID_RECOVERY);
        return;
      }

      const { data, error } = await createClient().auth.getUser();
      if (active) {
        setIsReady(Boolean(data.user) && !error);
        if (!data.user || error) setErrorMessage(INVALID_RECOVERY);
      }
    };
    void verifyRecoverySession();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    if (password !== confirmPassword) {
      setErrorMessage("兩次輸入的密碼不一致。");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) {
        console.warn("[auth/reset-password] updateUser failed", {
          operation: "updateUser",
          status: 400,
          code: error.code ?? "unknown",
        });
        setErrorMessage(GENERIC_ERROR);
        return;
      }
      setPassword("");
      setConfirmPassword("");
      setSuccessMessage("密碼已更新。請使用新密碼登入。");
      window.setTimeout(() => {
        window.location.assign("/login?password_reset=success");
      }, 600);
    } catch {
      console.warn("[auth/reset-password] update request failed", {
        operation: "updateUser",
        status: 500,
        code: "unexpected_error",
      });
      setErrorMessage(GENERIC_ERROR);
    } finally {
      setPassword("");
      setConfirmPassword("");
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-white">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/20 sm:p-8">
        <p className="text-sm font-semibold tracking-[0.28em] text-cyan-300">RAPID4GRAD</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">更新密碼</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">設定新的 Email 登入密碼。</p>
        {isReady ? <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-200" htmlFor="reset-password-new">新密碼<input id="reset-password-new" name="password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30" /></label>
          <label className="block text-sm font-medium text-slate-200" htmlFor="reset-password-confirm">確認新密碼<input id="reset-password-confirm" name="confirmPassword" type="password" autoComplete="new-password" minLength={6} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30" /></label>
          <button type="submit" disabled={isLoading} className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60">{isLoading ? "更新中..." : "更新密碼"}</button>
        </form> : null}
        {errorMessage ? <div className="mt-6 space-y-3"><p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{errorMessage}</p><Link className="block text-center text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/forgot-password">重新寄送密碼重設信</Link></div> : null}
        {successMessage ? <p role="status" className="mt-6 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">{successMessage}</p> : null}
      </section>
    </main>
  );
}
