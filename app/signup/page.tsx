"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { isSafeNextPath } from "@/lib/workspace/access";

const GENERIC_SIGNUP_ERROR = "註冊失敗，請確認資料後再試。";

function getSafeNextPath() {
  const rawNextPath = new URLSearchParams(window.location.search).get("next");
  return isSafeNextPath(rawNextPath) ? rawNextPath : null;
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("兩次輸入的密碼不一致。");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email,
          password,
          next: getSafeNextPath(),
        }),
      });
      const payload = (await response.json()) as {
        confirmationRequired?: boolean;
        redirectTo?: unknown;
        success?: boolean;
      };

      if (!response.ok || payload.success !== true) {
        setErrorMessage(GENERIC_SIGNUP_ERROR);
        return;
      }

      if (payload.confirmationRequired) {
        setSuccessMessage(
          "請查看 Email 是否收到帳號驗證信。若你原本使用 Google 登入，請改用 Google 登入後到「帳號與安全」建立密碼。",
        );
        return;
      }

      if (
        typeof payload.redirectTo !== "string" ||
        !isSafeNextPath(payload.redirectTo)
      ) {
        setErrorMessage(GENERIC_SIGNUP_ERROR);
        return;
      }

      window.location.assign(payload.redirectTo);
    } catch {
      setErrorMessage(GENERIC_SIGNUP_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-white">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/20 sm:p-8">
        <p className="text-sm font-semibold tracking-[0.28em] text-cyan-300">
          RAPID4GRAD
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          建立你的研究導航帳號
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          新帳號會以學生身分建立，不需要選擇工作區或角色。
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSignup}>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-200"
              htmlFor="signup-email"
            >
              Email
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-200"
              htmlFor="signup-password"
            >
              密碼
            </label>
            <input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
              placeholder="至少 6 個字元"
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-200"
              htmlFor="signup-confirm-password"
            >
              確認密碼
            </label>
            <input
              id="signup-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
              placeholder="再次輸入密碼"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "註冊中..." : "建立學生帳號"}
          </button>
        </form>

        {errorMessage ? (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200"
          >
            {errorMessage}
          </p>
        ) : null}
        {successMessage ? (
          <p
            role="status"
            className="mt-5 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100"
          >
            {successMessage}
          </p>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-400">
          已經有帳號？{" "}
          <Link
            className="font-semibold text-cyan-300 hover:text-cyan-200"
            href="/login"
          >
            返回登入
          </Link>
        </p>
      </section>
    </main>
  );
}
