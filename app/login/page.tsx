"use client";

import { useState } from "react";
import { isSafeNextPath } from "@/lib/workspace/access";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage("");

    const rawNextPath = new URLSearchParams(window.location.search).get("next");
    const nextPath = isSafeNextPath(rawNextPath) ? rawNextPath : null;
    const loginUrl = new URL("/auth/login", window.location.origin);

    if (nextPath) {
      loginUrl.searchParams.set("next", nextPath);
    }

    window.location.href = loginUrl.toString();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.20),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-12 text-white">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/80 p-7 shadow-2xl shadow-blue-950/30 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">
          RAPID4GRAD
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          登入你的研究工作台
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          使用 Google 帳號登入後，你可以進入 Dashboard、使用 AI 指令產生器，並在未來查看課程與工具權限。
        </p>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white px-5 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-blue-950/20 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
            G
          </span>
          {isLoading ? "正在前往 Google 登入..." : "使用 Google 帳號登入"}
        </button>

        {errorMessage ? (
          <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </p>
        ) : null}

        <p className="mt-5 text-xs leading-5 text-slate-500">
          登入代表你同意 RAPID4GRAD 使用 Supabase Auth 建立安全 Session。系統不會在前端暴露任何 secret key。
        </p>
      </section>
    </main>
  );
}
