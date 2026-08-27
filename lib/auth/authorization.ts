import "server-only";

import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createV2Client } from "@/lib/supabase/server";

export type WorkspaceRole = "student" | "professor" | "admin";
export type AccountStatus = "active" | "suspended";

export interface ActiveUserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: WorkspaceRole;
  account_status: AccountStatus;
}

export interface ActiveUserContext {
  user: { id: string; email?: string };
  profile: ActiveUserProfile;
  supabase: Awaited<ReturnType<typeof createV2Client>>;
}

function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return value === "student" || value === "professor" || value === "admin";
}

function isAccountStatus(value: unknown): value is AccountStatus {
  return value === "active" || value === "suspended";
}

export async function requireActiveUser(nextPath = "/dashboard"): Promise<ActiveUserContext> {
  const supabase = await createV2Client();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: rawProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !rawProfile || !isWorkspaceRole(rawProfile.role) || !isAccountStatus(rawProfile.account_status)) {
    console.error("[auth] Unable to load a valid user profile", {
      code: profileError?.code ?? "INVALID_PROFILE",
    });
    redirect("/login?error=profile_unavailable");
  }

  const profile: ActiveUserProfile = {
    id: rawProfile.id,
    email: rawProfile.email,
    full_name: rawProfile.full_name,
    role: rawProfile.role,
    account_status: rawProfile.account_status,
  };

  if (profile.account_status !== "active") {
    redirect("/account-suspended");
  }

  return { user, profile, supabase };
}

export async function requireStudentWorkspace(nextPath = "/dashboard") {
  const context = await requireActiveUser(nextPath);
  if (context.profile.role === "professor") {
    redirect("/professor/dashboard");
  }
  return context;
}

export async function requireProfessorWorkspace(nextPath = "/professor/dashboard") {
  const context = await requireActiveUser(nextPath);
  if (context.profile.role === "student") {
    redirect("/dashboard");
  }
  return context;
}

export async function getActiveApiUser() {
  const supabase = await createV2Client();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      response: NextResponse.json(
        { success: false, error: "AUTHENTICATION_REQUIRED" },
        { status: 401 },
      ),
    } as const;
  }

  const { data: rawProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !rawProfile || !isWorkspaceRole(rawProfile.role) || !isAccountStatus(rawProfile.account_status)) {
    console.error("[auth] API profile lookup failed", {
      code: profileError?.code ?? "INVALID_PROFILE",
    });
    return {
      response: NextResponse.json(
        { success: false, error: "PROFILE_UNAVAILABLE" },
        { status: 403 },
      ),
    } as const;
  }

  if (rawProfile.account_status !== "active") {
    return {
      response: NextResponse.json(
        { success: false, error: "ACCOUNT_SUSPENDED" },
        { status: 403 },
      ),
    } as const;
  }

  return {
    context: {
      user,
      profile: {
        id: rawProfile.id,
        email: rawProfile.email,
        full_name: rawProfile.full_name,
        role: rawProfile.role,
        account_status: rawProfile.account_status,
      },
      supabase,
    } satisfies ActiveUserContext,
  } as const;
}
