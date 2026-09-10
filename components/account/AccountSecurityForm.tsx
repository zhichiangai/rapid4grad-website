"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const GENERIC_UPDATE_ERROR = "無法建立密碼登入，請稍後再試。";

export function AccountSecurityForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.warn("[auth/account-security] updateUser failed", {
          operation: "updateUser",
          status: 400,
          code: error.code ?? "unknown",
        });
        setErrorMessage(GENERIC_UPDATE_ERROR);
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setSuccessMessage("密碼登入已建立。你現在可以登出後使用 Email + 密碼登入同一個帳號。");
    } catch {
      console.warn("[auth/account-security] updateUser request failed", {
        operation: "updateUser",
        status: 500,
        code: "unexpected_error",
      });
      setErrorMessage(GENERIC_UPDATE_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label
          className="mb-2 block text-sm font-medium text-slate-200"
          htmlFor="account-security-password"
        >
          新密碼
        </label>
        <input
          id="account-security-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
          placeholder="至少 6 個字元"
        />
      </div>

      <div>
        <label
          className="mb-2 block text-sm font-medium text-slate-200"
          htmlFor="account-security-confirm-password"
        >
          確認新密碼
        </label>
        <input
          id="account-security-confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
          placeholder="再次輸入新密碼"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "儲存中..." : "建立密碼登入"}
      </button>

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p
          role="status"
          className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100"
        >
          {successMessage}
        </p>
      ) : null}
    </form>
  );
}
