import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LabMemberManagement,
  type LabSeatUsage,
  type ProfessorLabMember,
} from "@/components/professor/LabMemberManagement";
import { ProfessorLabControls } from "@/components/professor/ProfessorLabControls";
import { createV2AdminClient, createV2Client } from "@/lib/supabase/server";
import { canAccessWorkspace } from "@/lib/workspace/access";
import type { LabMembershipStatus, LabRole } from "@/types/database";

type LabRow = {
  id: string;
  name: string;
  institution: string | null;
  owner_professor_id: string;
  created_at: string;
  updated_at: string;
};

type MembershipRow = {
  id: string;
  user_id: string;
  role: LabRole;
  status: LabMembershipStatus;
  joined_at: string;
  removed_at: string | null;
  removal_reason: string | null;
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  degree: string | null;
  department: string | null;
  research_area: string | null;
};

type SharedAuditSummary = {
  job_id: string;
  student_user_id: string;
  summary: string;
  risk_level: "low" | "medium" | "high" | null;
  issue_tags: string[];
  completed_at: string | null;
  created_at: string;
};

type LabPageProps = {
  params: Promise<{
    labId: string;
  }>;
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "尚無紀錄";
  }

  return new Date(value).toLocaleString("zh-TW");
}

function riskClass(riskLevel: string | null | undefined) {
  if (riskLevel === "high") {
    return "border-red-300/30 bg-red-400/10 text-red-100";
  }

  if (riskLevel === "medium") {
    return "border-amber-300/30 bg-amber-400/10 text-amber-100";
  }

  return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
}

async function requireProfessor() {
  const supabase = await createV2Client();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/professor/dashboard");
  }

  const admin = createV2AdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id,role")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: string }>();

  if (error) {
    throw new Error(error.message);
  }

  if (!canAccessWorkspace(profile?.role, "professor")) {
    redirect("/dashboard");
  }

  return { user, profile, admin, supabase };
}

export default async function ProfessorLabPage({ params }: LabPageProps) {
  const { labId } = await params;
  const { user, profile, admin, supabase } = await requireProfessor();

  const { data: lab, error: labError } = await admin
    .from("labs")
    .select("id,name,institution,owner_professor_id,created_at,updated_at")
    .eq("id", labId)
    .maybeSingle<LabRow>();

  if (labError) {
    throw new Error(labError.message);
  }

  if (!lab) {
    redirect("/professor/dashboard");
  }

  const isOwner = lab.owner_professor_id === user.id;
  const isAdminObservation = profile?.role === "admin";
  const { data: viewerMembership, error: viewerMembershipError } =
    !isOwner && !isAdminObservation
      ? await admin
          .from("lab_memberships")
          .select("role,status")
          .eq("lab_id", lab.id)
          .eq("user_id", user.id)
          .eq("status", "active")
          .in("role", ["professor", "assistant"])
          .maybeSingle()
      : { data: null, error: null };

  if (viewerMembershipError) {
    console.error("Professor Lab membership lookup failed", {
      code: viewerMembershipError.code,
    });
    redirect("/professor/dashboard");
  }
  if (!isOwner && !isAdminObservation && !viewerMembership) {
    redirect("/professor/dashboard");
  }

  const { data: currentSubscription } = await admin
    .from("subscriptions")
    .select("status,plan_key,current_period_end,grace_ends_at")
    .eq("lab_id", lab.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const now = Date.now();
  const subscriptionMode: "functional" | "read_only" | "none" =
    currentSubscription &&
    (((currentSubscription.status === "active" ||
      currentSubscription.status === "trialing") &&
      new Date(currentSubscription.current_period_end).getTime() > now) ||
      (currentSubscription.status === "past_due" &&
        currentSubscription.grace_ends_at &&
        new Date(currentSubscription.grace_ends_at).getTime() > now))
      ? "functional"
      : currentSubscription
        ? "read_only"
        : "none";

  const { data: membershipsData, error: membershipsError } = await admin
    .from("lab_memberships")
    .select("id,user_id,role,status,joined_at,removed_at,removal_reason")
    .eq("lab_id", lab.id)
    .order("created_at", { ascending: true })
    .returns<MembershipRow[]>();

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const memberships = membershipsData ?? [];
  const memberIds = memberships.map((membership) => membership.user_id);
  const { data: profilesData, error: profilesError } =
    memberIds.length > 0
      ? await admin
          .from("profiles")
          .select("id,email,full_name,degree,department,research_area")
          .in("id", memberIds)
          .returns<ProfileRow[]>()
      : { data: [], error: null };

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const { data: summariesData, error: summariesError } = await supabase.rpc(
    "get_shared_audit_summaries",
    { target_lab_id: lab.id },
  );
  if (summariesError) throw new Error(summariesError.message);

  const profilesById = new Map(
    (profilesData ?? []).map((studentProfile) => [studentProfile.id, studentProfile]),
  );
  const memberManagementRows = memberships
    .map((membership): ProfessorLabMember | null => {
      const memberProfile = profilesById.get(membership.user_id);
      if (!memberProfile) return null;

      return {
        id: membership.id,
        userId: membership.user_id,
        role: membership.role,
        status: membership.status,
        joinedAt: membership.joined_at,
        removedAt: membership.removed_at,
        removalReason: membership.removal_reason,
        isOwner: membership.user_id === lab.owner_professor_id,
        profile: {
          fullName: memberProfile.full_name,
          email: memberProfile.email,
          degree: memberProfile.degree,
          department: memberProfile.department,
        },
      };
    })
    .filter((membership): membership is ProfessorLabMember => membership !== null);
  const seatUsage: LabSeatUsage = {
    activeStudents: memberships.filter(
      (membership) =>
        membership.role === "student" && membership.status === "active",
    ).length,
    studentLimit:
      currentSubscription?.plan_key === "professor_lab_standard"
        ? 15
        : currentSubscription?.plan_key === "professor_lab_plus"
          ? 30
          : currentSubscription?.plan_key === "professor_lab_enterprise"
            ? null
            : 0,
    activeAssistants: memberships.filter(
      (membership) =>
        membership.role === "assistant" && membership.status === "active",
    ).length,
    assistantLimit: 3,
  };
  const latestSummaryByStudent = new Map<string, SharedAuditSummary>();
  for (const summary of (summariesData ?? []) as SharedAuditSummary[]) {
    if (!latestSummaryByStudent.has(summary.student_user_id)) {
      latestSummaryByStudent.set(summary.student_user_id, summary);
    }
  }

  const rows = memberships
    .filter(
      (membership) =>
        membership.role === "student" && membership.status === "active",
    )
    .map((membership) => {
      const studentProfile = profilesById.get(membership.user_id);
      const latestSummary = latestSummaryByStudent.get(membership.user_id);

      if (!studentProfile) {
        return null;
      }

      return {
        membership,
        studentProfile,
        latestSummary: latestSummary ?? null,
      };
    })
    .filter((row) => row !== null);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/professor/dashboard"
          className="text-sm font-semibold text-cyan-200 hover:text-cyan-100"
        >
          ← 回 Professor Dashboard
        </Link>

        <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200">
            Lab Detail
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            {lab.name}
          </h1>
          <p className="mt-2 text-slate-300">
            {lab.institution ?? "未設定單位"} · 建立於 {formatDate(lab.created_at)}
          </p>
        </section>

        {isOwner && profile?.role === "professor" ? (
          <div className="mt-6">
            <ProfessorLabControls
              labs={[
                {
                  id: lab.id,
                  name: lab.name,
                  institution: lab.institution,
                },
              ]}
              defaultLabId={lab.id}
              subscriptionMode={subscriptionMode}
            />
          </div>
        ) : null}

        <LabMemberManagement
          labId={lab.id}
          initialMembers={memberManagementRows}
          initialSeatUsage={seatUsage}
          canManage={
            isOwner &&
            profile?.role === "professor" &&
            subscriptionMode === "functional"
          }
          readOnlyReason={
            isAdminObservation
              ? "admin_observation"
              : !isOwner
                ? "not_owner"
                : "subscription"
          }
        />

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <h2 className="text-2xl font-semibold">Lab Students</h2>
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.2em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">學生</th>
                  <th className="px-4 py-3">研究背景</th>
                  <th className="px-4 py-3">最近 AI 稽核</th>
                  <th className="px-4 py-3">風險</th>
                  <th className="px-4 py-3">卡點</th>
                  <th className="px-4 py-3">加入時間</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-slate-400">
                      尚無學生加入。
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.studentProfile.id}>
                      <td className="px-4 py-4">
                        <Link
                          href={`/professor/labs/${lab.id}/students/${row.studentProfile.id}`}
                          className="font-semibold text-cyan-100 hover:text-cyan-200"
                        >
                          {row.studentProfile.full_name ?? row.studentProfile.email}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">
                          {row.studentProfile.email}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {row.studentProfile.degree ?? "未設定學位"}
                        <p className="mt-1 text-xs text-slate-500">
                          {row.studentProfile.research_area ??
                            row.studentProfile.department ??
                            "未設定研究背景"}
                        </p>
                      </td>
                      <td className="max-w-sm px-4 py-4 text-slate-300">
                        {row.latestSummary?.summary ?? "尚無稽核結果"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskClass(
                            row.latestSummary?.risk_level,
                          )}`}
                        >
                          {row.latestSummary?.risk_level ?? "low"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(row.latestSummary?.issue_tags ?? ["no_audit_yet"]).map(
                            (tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-white/[0.06] px-2 py-1 text-xs text-slate-300"
                              >
                                {tag}
                              </span>
                            ),
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-400">
                        {formatDate(row.membership.joined_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
