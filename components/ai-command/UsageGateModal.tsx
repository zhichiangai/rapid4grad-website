"use client";

import { useState } from "react";

type UsageGateReason = "verification_required" | "quota_exceeded";

type ApiResponse = {
  success?: boolean;
  error?: string;
};

interface UsageGateModalProps {
  isOpen: boolean;
  reason?: UsageGateReason | null;
  message?: string;
  onVerified: () => void;
  onClose: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PIN_PATTERN = /^\d{6}$/;

export function UsageGateModal({
  isOpen,
  reason,
  message,
  onVerified,
  onClose,
}: UsageGateModalProps) {
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [localMessage, setLocalMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const handleSendCode = async () => {
    setErrorMessage("");
    setLocalMessage("");

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setErrorMessage("請輸入有效的 Email。");
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/email/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "send",
          email: normalizedEmail,
        }),
      });

      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.success) {
        setErrorMessage(result.error || "驗證碼發送失敗，請稍後再試。");
        return;
      }

      setCodeSent(true);
      setLocalMessage("驗證碼已發送至你的信箱，請於 10 分鐘內輸入。");
    } catch {
      setErrorMessage("無法連線到 Email 驗證服務，請稍後再試。");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    setErrorMessage("");
    setLocalMessage("");

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setErrorMessage("請輸入有效的 Email。");
      return;
    }

    if (!codeSent) {
      setErrorMessage("請先發送驗證碼。");
      return;
    }

    if (!PIN_PATTERN.test(verificationCode.trim())) {
      setErrorMessage("請輸入 6 位數驗證碼。");
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch("/api/email/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "verify",
          email: normalizedEmail,
          pin: verificationCode.trim(),
        }),
      });

      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.success) {
        setErrorMessage(result.error || "驗證碼錯誤或已過期。");
        return;
      }

      onVerified();
      setEmail("");
      setVerificationCode("");
      setCodeSent(false);
      setLocalMessage("");
      setErrorMessage("");
    } catch {
      setErrorMessage("無法完成驗證，請稍後再試。");
    } finally {
      setIsVerifying(false);
    }
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
                  disabled={isSending || isVerifying}
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/50 disabled:cursor-not-allowed disabled:opacity-70"
                  placeholder="you@example.com"
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={isSending || isVerifying}
                  className="shrink-0 rounded-2xl border border-blue-300/20 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSending ? "發送中..." : "發送驗證碼"}
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
                disabled={isSending || isVerifying}
                inputMode="numeric"
                maxLength={6}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/50 disabled:cursor-not-allowed disabled:opacity-70"
                placeholder="輸入 6 位數驗證碼"
              />
            </label>

            <button
              type="button"
              onClick={handleVerify}
              disabled={isSending || isVerifying}
              className="w-full rounded-2xl bg-blue-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isVerifying ? "驗證中..." : "驗證並解鎖生成"}
            </button>
          </div>
        )}

        {localMessage ? (
          <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-100">
            {localMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}
