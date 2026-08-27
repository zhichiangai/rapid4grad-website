import { ProfessorLabControls } from "@/components/professor/ProfessorLabControls";
import {
  ProfessorWorkspaceHome,
  ProfessorWorkspaceLab,
} from "@/components/workspace/ProfessorWorkspaceHome";
import { createV2AdminClient } from "@/lib/supabase/server";
import { requireProfessorWorkspace } from "@/lib/auth/authorization";

type LabRow = {
  id: string;
  name: string;
  institution: string | null;
  owner_professor_id: string;
  created_at: string;
};

type ViewerLabMembershipRow = {
  lab_id: string;
  role: "professor" | "assistant";
};

type MembershipRow = {
  lab_id: string;
  user_id: string;
  joined_at: string;
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  degree: string | null;
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

async function getProfessorUser() {
  const context = await requireProfessorWorkspace("/professor/dashboard");
  return {
    user: context.user,
    profile: context.profile,
    admin: createV2AdminClient(),
    supabase: context.supabase,
  };
}

export default async function ProfessorDashboardPage() {
  const { user, profile, admin, supabase } = await getProfessorUser();
  const { data: currentSubscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .select("id,lab_id,plan_key,status,current_period_end,grace_ends_at,cancel_at_period_end")
    .eq("payer_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) {
    console.error("Professor subscription lookup failed", {
      code: subscriptionError.code,
    });
  }

  const now = Date.now();
  const subscriptionFunctional = Boolean(
    currentSubscription &&
      (((currentSubscription.status === "active" ||
        currentSubscription.status === "trialing") &&
        new Date(currentSubscription.current_period_end).getTime() > now) ||
        (currentSubscription.status === "past_due" &&
          currentSubscription.grace_ends_at &&
          new Date(currentSubscription.grace_ends_at).getTime() > now)),
  );
  const subscriptionMode: "functional" | "read_only" | "none" =
    subscriptionFunctional
      ? "functional"
      : currentSubscription
        ? "read_only"
        : "none";

  const { data: ownedLabsData, error: ownedLabsError } = await admin
    .from("labs")
    .select("id,name,institution,owner_professor_id,created_at")
    .eq("owner_professor_id", user.id)
    .order("created_at", { ascending: false })
    .returns<LabRow[]>();

  if (ownedLabsError) throw new Error(ownedLabsError.message);

  const { data: viewerMembershipsData, error: viewerMembershipsError } =
    profile.role === "professor"
      ? await admin
          .from("lab_memberships")
          .select("lab_id,role")
          .eq("user_id", user.id)
          .eq("status", "active")
          .in("role", ["professor", "assistant"])
          .returns<ViewerLabMembershipRow[]>()
      : { data: [], error: null };

  if (viewerMembershipsError) throw new Error(viewerMembershipsError.message);

  const visibleLabIds = [
    ...new Set([
      ...(ownedLabsData ?? []).map((lab) => lab.id),
      ...(viewerMembershipsData ?? []).map((membership) => membership.lab_id),
    ]),
  ];
  const { data: labsData, error: labsError } =
    visibleLabIds.length > 0
      ? await admin
          .from("labs")
          .select("id,name,institution,owner_professor_id,created_at")
          .in("id", visibleLabIds)
          .order("created_at", { ascending: false })
          .returns<LabRow[]>()
      : { data: [], error: null };
  if (labsError) throw new Error(labsError.message);

  const labs = labsData ?? [];
  const ownedLabs = labs.filter((lab) => lab.owner_professor_id === user.id);
  const labIds = labs.map((lab) => lab.id);
  const { data: membershipsData, error: membershipsError } =
    labIds.length > 0
      ? await admin
          .from("lab_memberships")
          .select("lab_id,user_id,joined_at")
          .in("lab_id", labIds)
          .eq("role", "student")
          .eq("status", "active")
          .returns<MembershipRow[]>()
      : { data: [], error: null };
  if (membershipsError) throw new Error(membershipsError.message);

  const memberships = membershipsData ?? [];
  const studentIds = [...new Set(memberships.map((membership) => membership.user_id))];
  const { data: profilesData, error: profilesError } =
    studentIds.length > 0
      ? await admin
          .from("profiles")
          .select("id,email,full_name,degree,research_area")
          .in("id", studentIds)
          .returns<ProfileRow[]>()
      : { data: [], error: null };
  if (profilesError) throw new Error(profilesError.message);

  const summaryResponses = await Promise.all(
    labIds.map((labId) =>
      supabase.rpc("get_shared_audit_summaries", { target_lab_id: labId }),
    ),
  );
  const summaryError = summaryResponses.find((response) => response.error)?.error;
  if (summaryError) throw new Error(summaryError.message);

  const profilesById = new Map(
    (profilesData ?? []).map((studentProfile) => [studentProfile.id, studentProfile]),
  );
  const latestSummaryByLabStudent = new Map<string, SharedAuditSummary>();
  summaryResponses.forEach((response, index) => {
    const labId = labIds[index];
    for (const summary of (response.data ?? []) as SharedAuditSummary[]) {
      const key = `${labId}:${summary.student_user_id}`;
      if (!latestSummaryByLabStudent.has(key)) {
        latestSummaryByLabStudent.set(key, summary);
      }
    }
  });

  const workspaceLabs: ProfessorWorkspaceLab[] = labs.map((lab) => ({
    id: lab.id,
    name: lab.name,
    institution: lab.institution,
    isOwner: lab.owner_professor_id === user.id,
    students: memberships
      .filter((membership) => membership.lab_id === lab.id)
      .flatMap((membership) => {
        const studentProfile = profilesById.get(membership.user_id);
        if (!studentProfile) return [];
        const summary = latestSummaryByLabStudent.get(
          `${lab.id}:${membership.user_id}`,
        );
        return [{
          id: studentProfile.id,
          name: studentProfile.full_name ?? studentProfile.email,
          email: studentProfile.email,
          degree: studentProfile.degree,
          researchArea: studentProfile.research_area,
          joinedAt: membership.joined_at,
          latestSummary: summary
            ? {
                summary: summary.summary,
                riskLevel: summary.risk_level,
                issueTags: summary.issue_tags,
                completedAt: summary.completed_at,
                createdAt: summary.created_at,
              }
            : null,
        }];
      }),
  }));

  return (
    <ProfessorWorkspaceHome
      viewerName={profile.full_name ?? profile.email ?? user.email ?? "Professor"}
      viewerRole={profile.role === "admin" ? "admin" : "professor"}
      labs={workspaceLabs}
      ownedLabCount={ownedLabs.length}
      subscriptionMode={subscriptionMode}
      subscriptionPlanKey={currentSubscription?.plan_key}
      subscriptionStatus={currentSubscription?.status}
      canManage={profile.role === "professor"}
      managerControls={
        profile.role === "professor" ? (
          <ProfessorLabControls
            labs={ownedLabs.map((lab) => ({
              id: lab.id,
              name: lab.name,
              institution: lab.institution,
            }))}
            subscriptionMode={subscriptionMode}
          />
        ) : null
      }
    />
  );
}
