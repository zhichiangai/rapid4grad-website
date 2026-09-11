import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createV2AdminClient } from "@/lib/supabase/server";
import type { ActiveUserContext } from "@/lib/auth/authorization";

export type LabMutationAccess = {
  allowed: boolean;
  reason: "role" | "membership" | "subscription" | null;
};

export async function getLabMutationAccess(context: ActiveUserContext, labId: string): Promise<LabMutationAccess> {
  if (context.profile.role !== "professor") return { allowed: false, reason: "role" };
  const admin = createV2AdminClient();
  const { data: lab } = await admin.from("labs").select("id,owner_professor_id,status").eq("id", labId).eq("status", "active").maybeSingle();
  if (!lab) return { allowed: false, reason: "membership" };
  const isOwner = lab.owner_professor_id === context.user.id;
  if (!isOwner) {
    const { data: membership } = await admin.from("lab_memberships").select("id").eq("lab_id", labId).eq("user_id", context.user.id).eq("role", "professor").eq("status", "active").maybeSingle();
    if (!membership) return { allowed: false, reason: "membership" };
  }
  const { data: subscription } = await admin.from("subscriptions").select("status,current_period_end,grace_ends_at").eq("lab_id", labId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const now = Date.now();
  const functional = Boolean(
    subscription && (
      (["active", "trialing"].includes(subscription.status) &&
        new Date(subscription.current_period_end).getTime() > now) ||
      (subscription.status === "past_due" &&
        subscription.grace_ends_at &&
        new Date(subscription.grace_ends_at).getTime() > now)
    ),
  );
  return functional ? { allowed: true, reason: null } : { allowed: false, reason: "subscription" };
}

export function asPlanningClient(context: ActiveUserContext) {
  return context.supabase as unknown as SupabaseClient;
}

export function planningErrorMessage(reason: LabMutationAccess["reason"]) {
  return reason === "subscription" ? "目前 Lab 為唯讀模式。" : "目前無權限修改這個 Lab。";
}
