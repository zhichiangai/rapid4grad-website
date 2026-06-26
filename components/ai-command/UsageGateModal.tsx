"use client";

import { useState } from "react";

interface UsageGateModalProps {
  isOpen: boolean;
  reason?: "verification_required" | "quota_exceeded" | null;
  message?: string;
  onVerified: (email: string) => void;
  onClose: () => void;
}

export function UsageGateModal({
  isOpen,
  reason,
  message,
  onVerified,
  onClose,
}: UsageGateModalProps) {
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [localMessage, setLocalMessage] = useState("");

  if (!isOpen) {
    return null;
  }

  const handleSendCode = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalMessage("請輸入有效的 Email。");
      return;
    }

    // Phase 1 placeholder: replace with real email OTP workflow later.
    setSentCode("123456");
    setLocalMessage("驗證碼已送出。Phase 1 測試碼為 123456。");
  };

  const handleVerify = () => {
    if (!sentCode) {
      setLocalMessage("請先發送驗證碼。");
      return;
    }

    if (verificationCode.trim() !== sentCode) {
      setLocalMessage("驗證碼不正確，請重新輸入。");
      return;
    }

    onVerified(email.trim().toLowerCase());
    setEmail("");
    setVerificationCode("");
    setSentCode("");
    setLocalMessage("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950 p-6 text-white shadow-2xl shadow-blue-950/40">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-blue-300">
              Usage Gate
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              {reason === "quota_exceeded"
                ? "免費額度已用完"
                : "請先完成 Email 驗證"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            關閉
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-400">
          {message ||
            "匿名免費試用已使用。輸入 Email 驗證後，每日可生成 2 次，總共 3 次免費額度。"}
        </p>

        {reason === "quota_exceeded" ? (
          <a
            href="/course"
            className="mt-6 inline-flex w-full justify-center rounded-2xl bg-blue-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400"
          >
            查看課程方案
          </a>
        ) : (
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-200">Email</span>
              <div className="mt-2 flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/50"
                  placeholder="you@example.com"
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  className="shrink-0 rounded-2xl border border-blue-300/20 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/20"
                >
                  發送驗證碼
                </button>
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-200">
                驗證碼
              </span>
              <input
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/50"
                placeholder="輸入 6 位數驗證碼"
              />
            </label>

            <button
              type="button"
              onClick={handleVerify}
              className="w-full rounded-2xl bg-blue-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400"
            >
              驗證並解鎖生成
            </button>
          </div>
        )}

        {localMessage ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-slate-300">
            {localMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}
