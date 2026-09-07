import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createV2AdminClient } from "@/lib/supabase/server";
import { isFunctionalSubscription } from "@/lib/supervision/weekly-updates";

export type StudentLabMode = "functional" | "read_only" | "none";

export type StudentCapabilities = {
  identity: { isStudent: boolean };
  personal: {
    weekly: boolean;
    meetings: boolean;
    actions: boolean;
    thesis: boolean;
    graduationRisk: boolean;
    advisorProfile: boolean;
    aiNavigator: boolean;
  };
  course: {
    canOpenLearningCenter: boolean;
  };
  lab: {
    hasActiveLab: boolean;
    labId: string | null;
    labName: string | null;
    mode: StudentLabMode;
    canShareWeekly: boolean;
    canCreateLabMeeting: boolean;
    canManageLabActions: boolean;
    canUsePdfAudit: boolean;
  };
};

type MembershipRow = {
  lab_id: string;
  labs: { id: string; name: string; status: string } | null;
};

type SubscriptionRow = {
  status: string;
  current_period_start: string;
  current_period_end: string;
  grace_ends_at: string | null;
};

export async function resolveStudentCapabilities(
  supabase: SupabaseClient,
  userId: string,
): Promise<StudentCapabilities> {
  const { data: membership } = await supabase
    .from("lab_memberships")
    .select("lab_id,labs(id,name,status)")
    .eq("user_id", userId)
    .eq("role", "student")
    .eq("status", "active")
    .limit(1)
    .maybeSingle<MembershipRow>();

  const activeLab = membership?.labs?.status === "active" ? membership : null;
  let mode: StudentLabMode = "none";

  if (activeLab) {
    const { data: subscription } = await createV2AdminClient()
      .from("subscriptions")
      .select("status,current_period_start,current_period_end,grace_ends_at")
      .eq("lab_id", activeLab.lab_id)
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle<SubscriptionRow>();
    mode = isFunctionalSubscription(subscription) ? "functional" : "read_only";
  }

  const labAvailable = Boolean(activeLab);
  const labFunctional = mode === "functional";

  return {
    identity: { isStudent: true },
    personal: {
      weekly: true,
      meetings: true,
      actions: true,
      thesis: true,
      graduationRisk: true,
      advisorProfile: true,
      aiNavigator: true,
    },
    course: {
      canOpenLearningCenter: true,
    },
    lab: {
      hasActiveLab: labAvailable,
      labId: activeLab?.lab_id ?? null,
      labName: activeLab?.labs?.name ?? null,
      mode,
      canShareWeekly: labFunctional,
      canCreateLabMeeting: labFunctional,
      canManageLabActions: labFunctional,
      canUsePdfAudit: labFunctional,
    },
  };
}
