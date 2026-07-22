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
  const dialogTitleId = useId();
  const [reason, setReason] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const isDanger = tone === "danger";

  return (
    <div className="space-y-2">
      <input type="hidden" name="confirmation" value={confirmationToken} />
      <label className="block text-xs font-medium text-slate-300">
        操作原因（必填）
        <textarea
          name="reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          minLength={3}
          maxLength={500}
          rows={3}
          required
          placeholder={reasonPlaceholder}
          className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
        />
      </label>
      <button
        type="button"
        disabled={pending || reason.trim().length < 3}
        onClick={() => setIsOpen(true)}
        className={
          isDanger
            ? "w-full rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            : "w-full rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {pending ? "處理中..." : buttonLabel}
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-slate-950/50">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
              Admin Confirmation
            </p>
            <h3
              id={dialogTitleId}
              className="mt-3 text-2xl font-semibold text-white"
            >
              {dialogTitle}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {dialogDescription}
            </p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Reason
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">
                {reason.trim()}
              </p>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.05]"
              >
                返回檢查
              </button>
              <button
                type="button"
                onClick={(event) => {
                  setIsOpen(false);
                  event.currentTarget.closest("form")?.requestSubmit();
                }}
                className={
                  isDanger
                    ? "rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400"
                    : "rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400"
                }
              >
                再次確認並執行
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
