"use client";

import { useState } from "react";
import type { LabMembershipStatus, LabRole } from "@/types/database";

export type ProfessorLabMember = {
  id: string;
  userId: string;
  role: LabRole;
  status: LabMembershipStatus;
  joinedAt: string;
  removedAt: string | null;
  removalReason: string | null;
  isOwner: boolean;
  profile: {
    fullName: string | null;
    email: string;
    degree: string | null;
    department: string | null;
  };
};

export type LabSeatUsage = {
  activeStudents: number;
  studentLimit: number | null;
  activeAssistants: number;
  assistantLimit: number;
};

type MemberMutationResponse =
  | {
      success: true;
      membership: {
        id: string;
        user_id: string;
        role: LabRole;
        status: LabMembershipStatus;
        joined_at: string;
        removed_at: string | null;
        removal_reason: string | null;
      };
      seatUsage: LabSeatUsage;
    }
  | { success: false; error: string };

type LabMemberManagementProps = {
  labId: string;
  initialMembers: ProfessorLabMember[];
  initialSeatUsage: LabSeatUsage;
  canManage: boolean;
  readOnlyReason?: "subscription" | "not_owner" | "admin_observation";
};

const ROLE_LABELS: Record<LabRole, string> = {
  professor: "Professor",
  assistant: "Assistant",
  student: "Student",
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("zh-TW") : "-";
}

function statusClass(status: LabMembershipStatus) {
  if (status === "active") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }
  if (status === "pending") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }
  return "border-white/10 bg-white/[0.04] text-slate-400";
}

export function LabMemberManagement({
  labId,
  initialMembers,
  initialSeatUsage,
  canManage,
  readOnlyReason = "subscription",
}: LabMemberManagementProps) {
  const [members, setMembers] = useState(initialMembers);
  const [seatUsage, setSeatUsage] = useState(initialSeatUsage);
  const [selectedMember, setSelectedMember] =
    useState<ProfessorLabMember | null>(null);
  const [reason, setReason] = useState("");
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function updateMemberFromResponse(payload: Extract<MemberMutationResponse, { success: true }>) {
    setMembers((current) =>
      current.map((member) =>
        member.userId === payload.membership.user_id
          ? {
              ...member,
              role: payload.membership.role,
              status: payload.membership.status,
              joinedAt: payload.membership.joined_at,
              removedAt: payload.membership.removed_at,
              removalReason: payload.membership.removal_reason,
            }
          : member,
      ),
    );
    setSeatUsage(payload.seatUsage);
  }

  async function mutateMember(body: Record<string, string>) {
    const response = await fetch("/api/labs/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labId, ...body }),
    });
    const payload = (await response.json()) as MemberMutationResponse;
    if (!response.ok || !payload.success) {
      throw new Error(payload.success ? "成員更新失敗。" : payload.error);
    }
    return payload;
  }

  async function handleRoleChange(member: ProfessorLabMember, role: LabRole) {
    if (!canManage || member.isOwner || member.status !== "active") return;

    setMessage(null);
    setBusyMemberId(member.id);
    try {
      const payload = await mutateMember({
        action: "change_role",
        memberUserId: member.userId,
        role,
      });
      updateMemberFromResponse(payload);
      setMessage(`已將 ${member.profile.fullName ?? member.profile.email} 調整為 ${ROLE_LABELS[role]}。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "成員角色更新失敗。");
    } finally {
      setBusyMemberId(null);
    }
  }

  async function handleRemove() {
    if (!selectedMember || !canManage) return;

    const normalizedReason = reason.trim();
    if (normalizedReason.length < 3 || normalizedReason.length > 500) {
      setMessage("移除原因必須是 3 至 500 個字元。");
      return;
    }

    setMessage(null);
    setBusyMemberId(selectedMember.id);
    try {
      const payload = await mutateMember({
        action: "remove",
        memberUserId: selectedMember.userId,
        reason: normalizedReason,
      });
      updateMemberFromResponse(payload);
      setMessage(
        `已移除 ${selectedMember.profile.fullName ?? selectedMember.profile.email}；舊 Lab summary consent 已同步失效。`,
      );
      setSelectedMember(null);
      setReason("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "成員移除失敗。");
    } finally {
      setBusyMemberId(null);
    }
  }

  return (
    <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.035] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
            Member Management
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Lab 成員與席位</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            移除只會停用 membership，不會刪除帳號、私人 PDF、歷史稽核或學生永久課程權限。
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl border border-blue-300/20 bg-blue-300/10 px-4 py-3">
            <p className="text-xs text-blue-100/70">Student seats</p>
            <p className="mt-1 font-semibold text-blue-50">
              {seatUsage.activeStudents} / {seatUsage.studentLimit ?? "洽談"}
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3">
            <p className="text-xs text-cyan-100/70">Assistants</p>
            <p className="mt-1 font-semibold text-cyan-50">
              {seatUsage.activeAssistants} / {seatUsage.assistantLimit}
            </p>
          </div>
        </div>
      </div>

      {!canManage ? (
        <p className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          {readOnlyReason === "not_owner"
            ? "你是此 Lab 的 Professor/assistant 成員。只有 Lab owner 可以變更角色或移除成員。"
            : readOnlyReason === "admin_observation"
              ? "Admin 在 Professor workspace 僅能觀察；敏感修正必須回到 Admin control plane。"
              : "訂閱目前為唯讀狀態。你仍可查看歷史成員，但不能變更角色或移除成員。"}
        </p>
      ) : null}

      {message ? (
        <p className="mt-5 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">
          {message}
        </p>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.18em] text-slate-400">
            <tr>
              <th className="px-4 py-3">成員</th>
              <th className="px-4 py-3">角色</th>
              <th className="px-4 py-3">狀態</th>
              <th className="px-4 py-3">加入時間</th>
              <th className="px-4 py-3">移除時間</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {members.map((member) => {
              const isBusy = busyMemberId === member.id;
              const canChangeStaffRole =
                canManage &&
                !member.isOwner &&
                member.status === "active" &&
                member.role !== "student";
              const canRemove =
                canManage && !member.isOwner && member.status !== "removed";

              return (
                <tr key={member.id} className={member.status === "removed" ? "opacity-60" : ""}>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-white">
                      {member.profile.fullName ?? member.profile.email}
                      {member.isOwner ? " · Owner" : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{member.profile.email}</p>
                    {member.profile.degree || member.profile.department ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {[member.profile.degree, member.profile.department]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    {canChangeStaffRole ? (
                      <select
                        value={member.role}
                        disabled={isBusy}
                        onChange={(event) =>
                          handleRoleChange(member, event.target.value as LabRole)
                        }
                        className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-cyan-400 disabled:opacity-60"
                      >
                        <option value="professor">Professor</option>
                        <option value="assistant">Assistant</option>
                      </select>
                    ) : (
                      <span className="text-slate-300">{ROLE_LABELS[member.role]}</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(member.status)}`}>
                      {member.status}
                    </span>
                    {member.removalReason ? (
                      <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
                        {member.removalReason}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-slate-400">{formatDate(member.joinedAt)}</td>
                  <td className="px-4 py-4 text-slate-400">{formatDate(member.removedAt)}</td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      disabled={!canRemove || isBusy}
                      onClick={() => {
                        setMessage(null);
                        setReason("");
                        setSelectedMember(member);
                      }}
                      className="rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-300/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-slate-600"
                    >
                      {isBusy ? "處理中..." : member.isOwner ? "Owner 不可移除" : member.status === "removed" ? "已移除" : "移除成員"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedMember ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-member-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-[2rem] border border-red-300/20 bg-slate-900 p-6 shadow-2xl shadow-red-950/30">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-200">
              Confirm Removal
            </p>
            <h3 id="remove-member-title" className="mt-3 text-2xl font-semibold text-white">
              確認移除 {selectedMember.profile.fullName ?? selectedMember.profile.email}？
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              成員會立即失去此 Lab 的影片、PDF shared pool、新稽核資格與舊摘要分享；私人資料與永久課程仍保留。
            </p>
            <label className="mt-5 block text-sm text-slate-200">
              移除原因（必填）
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={3}
                maxLength={500}
                rows={4}
                autoFocus
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-red-300"
                placeholder="例如：學生已離開本實驗室"
              />
            </label>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busyMemberId === selectedMember.id}
                onClick={() => {
                  setSelectedMember(null);
                  setReason("");
                }}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.05] disabled:opacity-60"
              >
                取消
              </button>
              <button
                type="button"
                disabled={
                  busyMemberId === selectedMember.id || reason.trim().length < 3
                }
                onClick={handleRemove}
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyMemberId === selectedMember.id ? "移除中..." : "再次確認並移除"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
