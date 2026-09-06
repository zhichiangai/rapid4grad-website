"use client";

import { useState } from "react";
import { isSafeNextPath } from "@/lib/workspace/access";

export default function AdminLoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = () => {
    setIsLoading(true);
    const rawNextPath = new URLSearchParams(window.location.search).get("next");
    const nextPath = isSafeNextPath(rawNextPath) ? rawNextPath : "/admin";
    const loginUrl = new URL("/auth/login", window.location.origin);
    loginUrl.searchParams.set("next", nextPath);
    window.location.href = loginUrl.toString();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(8,145,178,0.20),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-12 text-white">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/80 p-7 shadow-2xl shadow-cyan-950/30 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">RAPID4GRAD ADMIN</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">登入管理者控制台</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          請使用已授權的 Admin Google 帳號登入。登入成功後會返回你剛才要開啟的管理頁面。
        </p>
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white px-5 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">G</span>
          {isLoading ? "正在前往 Google 登入..." : "使用 Admin Google 帳號登入"}
        </button>
        <p className="mt-5 text-xs leading-5 text-slate-500">
          這個入口只負責登入；Admin 權限仍會在伺服器端再次驗證。
        </p>
      </section>
    </main>
  );
}
