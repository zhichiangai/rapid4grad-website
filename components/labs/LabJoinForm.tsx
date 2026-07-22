"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { LabRole } from "@/types/database";

type JoinLabResponse =
  | {
      success: true;
      alreadyJoined: boolean;
      lab: {
        id: string;
        name: string;
        institution: string | null;
        role: LabRole;
      };
    }
  | {
      success: false;
      error: string;
    };

export function LabJoinForm() {
  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [joinedLab, setJoinedLab] =
    useState<Extract<JoinLabResponse, { success: true }>["lab"] | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setJoinedLab(null);

    try {
      const response = await fetch("/api/labs/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });
      const payload = (await response.json()) as JoinLabResponse;

      if (!response.ok || !payload.success) {
        setMessage(payload.success ? "加入失敗。" : payload.error);
        return;
      }

      setJoinedLab(payload.lab);
      setMessage(
        payload.alreadyJoined ? "你已經是這個 Lab 成員。" : "已成功加入 Lab。",
      );
      setInviteCode("");
    } catch {
      setMessage("加入失敗，請稍後再試。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-blue-950/30"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
        Lab Invite
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
        使用邀請碼加入 Lab
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        請輸入 Lab owner 提供的邀請碼。系統會依邀請碼指定的角色加入，且只儲存雜湊後的邀請碼。
      </p>

      <label className="mt-6 block text-sm text-slate-300">
        Lab 邀請碼
        <input
          value={inviteCode}
          onChange={(event) => setInviteCode(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-lg tracking-[0.14em] text-white outline-none transition focus:border-cyan-400"
          placeholder="ABCD-EFGH-IJKL"
          minLength={8}
          required
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-5 w-full rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "驗證中..." : "加入 Lab"}
      </button>

      {message ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200">
          <p>{message}</p>
          {joinedLab ? (
            <div className="mt-3">
              <p className="font-semibold text-white">{joinedLab.name}</p>
              {joinedLab.institution ? (
                <p className="text-slate-400">{joinedLab.institution}</p>
              ) : null}
              <p className="mt-1 text-xs text-slate-400">
                Lab 角色：{joinedLab.role}
              </p>
              <Link
                href={
                  joinedLab.role === "student"
                    ? "/dashboard/ai-audit"
                    : "/professor/dashboard"
                }
                className="mt-3 inline-flex rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                {joinedLab.role === "student"
                  ? "前往 PDF AI 稽核"
                  : "前往 Professor Dashboard"}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
