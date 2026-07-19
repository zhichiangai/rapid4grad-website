"use client";

import { FormEvent, useState } from "react";

type LabSummary = {
  id: string;
  name: string;
  institution: string | null;
};

type CreateLabResponse =
  | {
      success: true;
      lab: LabSummary;
    }
  | {
      success: false;
      error: string;
    };

type CreateInviteResponse =
  | {
      success: true;
      inviteCode: string;
      invite: {
        id: string;
        lab_id: string;
        expires_at: string;
        max_uses: number | null;
        used_count: number;
        revoked_at: string | null;
        created_at: string;
      };
      lab: {
        id: string;
        name: string;
      };
    }
  | {
      success: false;
      error: string;
    };

type RevokeInviteResponse =
  | {
      success: true;
      alreadyRevoked: boolean;
      invite: {
        id: string;
        lab_id: string;
        expires_at: string;
        max_uses: number | null;
        used_count: number;
        revoked_at: string | null;
        created_at: string;
      };
    }
  | {
      success: false;
      error: string;
    };

type ProfessorLabControlsProps = {
  labs: LabSummary[];
  defaultLabId?: string;
  subscriptionMode: "functional" | "read_only" | "none";
};

function isInviteInactive(invite: {
  expires_at: string;
  max_uses: number | null;
  used_count: number;
  revoked_at: string | null;
}) {
  if (invite.revoked_at) {
    return true;
  }

  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    return true;
  }

  return invite.max_uses !== null && invite.used_count >= invite.max_uses;
}

export function ProfessorLabControls({
  labs,
  defaultLabId,
  subscriptionMode,
}: ProfessorLabControlsProps) {
  const [labName, setLabName] = useState("");
  const [institution, setInstitution] = useState("");
  const [selectedLabId, setSelectedLabId] = useState(defaultLabId ?? labs[0]?.id ?? "");
  const [expiresInDays, setExpiresInDays] = useState("14");
  const [maxUses, setMaxUses] = useState("20");
  const [createdInvite, setCreatedInvite] =
    useState<Extract<CreateInviteResponse, { success: true }> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isCreatingLab, setIsCreatingLab] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [isRevokingInvite, setIsRevokingInvite] = useState(false);
  const canManageMembers = subscriptionMode === "functional";

  async function handleCreateLab(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsCreatingLab(true);

    try {
      const response = await fetch("/api/labs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: labName,
          institution,
        }),
      });
      const payload = (await response.json()) as CreateLabResponse;

      if (!response.ok || !payload.success) {
        setMessage(payload.success ? "Lab 建立失敗。" : payload.error);
        return;
      }

      setMessage(`已建立實驗室：${payload.lab.name}。重新整理後會出現在列表。`);
      setLabName("");
      setInstitution("");
    } catch {
      setMessage("Lab 建立失敗，請稍後再試。");
    } finally {
      setIsCreatingLab(false);
    }
  }

  async function handleCreateInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setCreatedInvite(null);
    setIsCreatingInvite(true);

    try {
      const response = await fetch("/api/labs/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labId: selectedLabId,
          expiresInDays: Number(expiresInDays),
          maxUses: Number(maxUses),
        }),
      });
      const payload = (await response.json()) as CreateInviteResponse;

      if (!response.ok || !payload.success) {
        setMessage(payload.success ? "邀請碼建立失敗。" : payload.error);
        return;
      }

      setCreatedInvite(payload);
      setMessage("邀請碼已建立。這組明碼只會在這裡顯示一次。");
    } catch {
      setMessage("邀請碼建立失敗，請稍後再試。");
    } finally {
      setIsCreatingInvite(false);
    }
  }

  async function handleRevokeInvite() {
    if (!createdInvite || isInviteInactive(createdInvite.invite)) {
      return;
    }

    setMessage(null);
    setIsRevokingInvite(true);

    try {
      const response = await fetch("/api/labs/invite", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labId: createdInvite.lab.id,
          inviteId: createdInvite.invite.id,
        }),
      });
      const payload = (await response.json()) as RevokeInviteResponse;

      if (!response.ok || !payload.success) {
        setMessage(payload.success ? "邀請碼撤銷失敗。" : payload.error);
        return;
      }

      setCreatedInvite((current) =>
        current
          ? {
              ...current,
              invite: payload.invite,
            }
          : current,
      );
      setMessage(
        payload.alreadyRevoked
          ? "邀請碼已經是撤銷狀態。"
          : "邀請碼已撤銷，學生將無法再使用這組代碼。",
      );
    } catch {
      setMessage("邀請碼撤銷失敗，請稍後再試。");
    } finally {
      setIsRevokingInvite(false);
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
      <form
        onSubmit={handleCreateLab}
        className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-blue-950/20"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
          Create Lab
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">建立正式實驗室</h2>
        <div className="mt-5 space-y-3">
          <label className="block text-sm text-slate-300">
            實驗室名稱
            <input
              value={labName}
              onChange={(event) => setLabName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-400"
              minLength={2}
              required
              placeholder="例如：AI Research Lab"
            />
          </label>
          <label className="block text-sm text-slate-300">
            學校 / 單位
            <input
              value={institution}
              onChange={(event) => setInstitution(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-400"
              placeholder="例如：National Taiwan Tech"
            />
          </label>
          <button
            type="submit"
            disabled={isCreatingLab}
            className="w-full rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreatingLab ? "建立中..." : "建立 Lab"}
          </button>
        </div>
      </form>

      <form
        onSubmit={handleCreateInvite}
        className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-cyan-950/20"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
          Invite Code
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          產生學生加入碼
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <label className="block text-sm text-slate-300 sm:col-span-3">
            指定 Lab
            <select
              value={selectedLabId}
              onChange={(event) => setSelectedLabId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              required
            >
              {labs.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  {lab.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-300">
            有效天數
            <input
              value={expiresInDays}
              onChange={(event) => setExpiresInDays(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              type="number"
              min={1}
              max={90}
              required
            />
          </label>
          <label className="block text-sm text-slate-300">
            可用次數
            <input
              value={maxUses}
              onChange={(event) => setMaxUses(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              type="number"
              min={1}
              max={200}
              required
            />
          </label>
          <button
            type="submit"
            disabled={isCreatingInvite || labs.length === 0 || !canManageMembers}
            className="self-end rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreatingInvite ? "產生中..." : "產生邀請碼"}
          </button>
        </div>

        {!canManageMembers ? (
          <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100">
            {subscriptionMode === "none"
              ? "請先啟用 30 天試用或正式訂閱，再產生學生邀請碼。"
              : "目前訂閱已進入唯讀狀態，不能新增成員或產生邀請碼。"}
          </p>
        ) : null}

        {createdInvite ? (
          <div
            className={`mt-5 rounded-2xl p-4 ${
              isInviteInactive(createdInvite.invite)
                ? "border border-white/10 bg-slate-900/80"
                : "border border-cyan-300/30 bg-cyan-300/10"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
              {isInviteInactive(createdInvite.invite)
                ? "Invite unavailable"
                : "One-time visible code"}
            </p>
            <p
              className={`mt-2 select-all font-mono text-2xl font-bold tracking-[0.18em] ${
                isInviteInactive(createdInvite.invite) ? "text-slate-400" : "text-white"
              }`}
            >
              {createdInvite.inviteCode}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              學生到 /dashboard/lab-join 輸入此碼。到期時間：
              {new Date(createdInvite.invite.expires_at).toLocaleString("zh-TW")}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              狀態：
              {createdInvite.invite.revoked_at
                ? "已撤銷"
                : isInviteInactive(createdInvite.invite)
                  ? "已過期/已用盡"
                  : "可使用"}
            </p>
            <button
              type="button"
              onClick={handleRevokeInvite}
              disabled={isRevokingInvite || isInviteInactive(createdInvite.invite)}
              className="mt-4 rounded-2xl border border-white/10 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-400 hover:bg-slate-900 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-slate-900/70 disabled:text-slate-500"
            >
              {isRevokingInvite ? "撤銷中..." : "撤銷此邀請碼 (Revoke)"}
            </button>
          </div>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">
            {message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
