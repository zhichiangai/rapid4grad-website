"use client";

import { useId, useState } from "react";
import { useFormStatus } from "react-dom";

type AdminConfirmActionProps = {
  confirmationToken: string;
  buttonLabel: string;
  dialogTitle: string;
  dialogDescription: string;
  reasonPlaceholder: string;
  tone?: "default" | "danger";
};

export function AdminConfirmAction({
  confirmationToken,
  buttonLabel,
  dialogTitle,
  dialogDescription,
  reasonPlaceholder,
  tone = "default",
}: AdminConfirmActionProps) {
  const { pending } = useFormStatus();
  const titleId = useId();
  const descriptionId = useId();
  const [reason, setReason] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const isDanger = tone === "danger";
  const trimmedReason = reason.trim();

  return (
    <div>
      <input type="hidden" name="confirmation" value={confirmationToken} />
      <button
        type="button"
        disabled={pending}
        onClick={() => setIsOpen(true)}
        className={`min-h-11 w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
          isDanger
            ? "bg-red-500/80 text-white hover:bg-red-500"
            : "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
        }`}
      >
        {buttonLabel}
      </button>
      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Admin Confirmation</p>
                <h2 id={titleId} className="mt-2 text-xl font-semibold text-white">{dialogTitle}</h2>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} disabled={pending} className="min-h-11 rounded-lg px-3 text-sm text-slate-300 hover:bg-white/10 hover:text-white">關閉</button>
            </div>
            <p id={descriptionId} className="mt-3 text-sm leading-6 text-slate-300">{dialogDescription}</p>
            <label className="mt-5 block text-sm font-medium text-slate-200">
              操作原因（必填）
              <textarea
                name="reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={reasonPlaceholder}
                minLength={3}
                maxLength={500}
                rows={4}
                required
                autoFocus
                className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300"
              />
            </label>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setIsOpen(false)} disabled={pending} className="min-h-11 rounded-xl border border-white/15 px-4 py-3 text-sm text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-50">返回檢查</button>
              <button
                type="button"
                disabled={pending || trimmedReason.length < 3}
                onClick={(event) => {
                  event.currentTarget.closest("form")?.requestSubmit();
                }}
                className={`min-h-11 rounded-xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${isDanger ? "bg-red-500 text-white" : "bg-cyan-400 text-slate-950"}`}
              >
                {pending ? "處理中..." : "再次確認並執行"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
