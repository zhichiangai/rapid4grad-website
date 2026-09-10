"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { isSafeNextPath } from "@/lib/workspace/access";

const GENERIC_LOGIN_ERROR =
  "登入失敗，請確認 Email、密碼及 Email 驗證狀態後再試。";

function getSafeNextPath() {
  const rawNextPath = new URLSearchParams(window.location.search).get("next");
  return isSafeNextPath(rawNextPath) ? rawNextPath : null;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (error) {
      setErrorMessage(GENERIC_LOGIN_ERROR);
    }
  }, []);

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/auth/email-login", {
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
        redirectTo?: unknown;
        success?: boolean;
      };

      if (
        !response.ok ||
        payload.success !== true ||
        typeof payload.redirectTo !== "string" ||
        !isSafeNextPath(payload.redirectTo)
      ) {
        setErrorMessage(GENERIC_LOGIN_ERROR);
        return;
      }

      window.location.assign(payload.redirectTo);
    } catch {
      setErrorMessage(GENERIC_LOGIN_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setErrorMessage("");
    const nextPath = getSafeNextPath();
    const loginUrl = new URL("/auth/login", window.location.origin);

    if (nextPath) {
      loginUrl.searchParams.set("next", nextPath);
    }

    window.location.href = loginUrl.toString();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-white">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/20 sm:p-8">
        <p className="text-sm font-semibold tracking-[0.28em] text-cyan-300">
          RAPID4GRAD
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          登入你的研究導航系統
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          使用 Email 或 Google 帳號登入，繼續你的研究規劃。
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleEmailLogin}>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-200"
              htmlFor="login-email"
            >
              Email
            </label>
            <input
              id="login-email"
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
              htmlFor="login-password"
            >
              密碼
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
              placeholder="輸入密碼"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "登入中..." : "登入"}
          </button>
        </form>

        <div className="my-7 flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-slate-800" />
          <span>或</span>
          <span className="h-px flex-1 bg-slate-800" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-semibold text-white transition hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden="true" className="text-lg font-bold text-cyan-300">
            G
          </span>
          {isLoading ? "處理中..." : "使用 Google 登入"}
        </button>

        {errorMessage ? (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200"
          >
            {errorMessage}
          </p>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-400">
          還沒有帳號？{" "}
          <Link
            className="font-semibold text-cyan-300 hover:text-cyan-200"
            href="/signup"
          >
            建立學生帳號
          </Link>
        </p>
        <p className="mt-6 text-xs leading-5 text-slate-500">
          登入代表你同意 RAPID4GRAD 使用 Supabase Auth 安全處理登入狀態。
        </p>
      </section>
    </main>
  );
}
