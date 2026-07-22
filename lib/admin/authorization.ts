import "server-only";

import { redirect } from "next/navigation";
import { createV2AdminClient, createV2Client } from "@/lib/supabase/server";

export type AdminContext = {
  user: {
    id: string;
    email: string | undefined;
  };
  profile: {
    id: string;
    email: string;
    fullName: string | null;
    role: "admin";
    accountStatus: "active";
  };
  admin: ReturnType<typeof createV2AdminClient>;
};

export async function requireAdminContext(
  nextPath = "/admin",
): Promise<AdminContext> {
  const supabase = await createV2Client();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[admin-auth] Profile lookup failed", { code: error.code });
    redirect("/dashboard");
  }

  if (
    !profile ||
    profile.role !== "admin" ||
    profile.account_status !== "active"
  ) {
    redirect("/dashboard");
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    profile: {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: "admin",
      accountStatus: "active",
    },
    admin: createV2AdminClient(),
  };
}
