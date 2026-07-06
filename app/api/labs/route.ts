import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { canAccessWorkspace } from "@/lib/workspace/access";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

type CreateLabBody = {
  name?: unknown;
  institution?: unknown;
};

function jsonError(message: string, status = 400, extra?: Record<string, Json>) {
  return NextResponse.json(
    { success: false, error: message, ...extra },
    { status },
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return jsonError(userError.message, 401);
  }

  if (!user) {
    return jsonError("Login is required before creating a lab.", 401);
  }

  let body: CreateLabBody;

  try {
    body = (await request.json()) as CreateLabBody;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (typeof body.name !== "string" || body.name.trim().length < 2) {
    return jsonError("Lab name must be at least 2 characters.", 400);
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,role")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: string }>();

  if (profileError) {
    return jsonError(profileError.message, 500);
  }

  if (!canAccessWorkspace(profile?.role, "professor")) {
    return jsonError(
      "Only professor workspace accounts can create labs.",
      403,
    );
  }

  const { data: lab, error: labError } = await admin
    .from("labs")
    .insert({
      owner_professor_id: user.id,
      name: body.name.trim(),
      institution:
        typeof body.institution === "string" && body.institution.trim()
          ? body.institution.trim()
          : null,
    })
    .select("id,name,institution,created_at")
    .single();

  if (labError) {
    return jsonError(labError.message, 500);
  }

  const { error: membershipError } = await admin
    .from("lab_memberships")
    .upsert(
      {
        lab_id: lab.id,
        user_id: user.id,
        role: "professor",
        status: "active",
      },
      { onConflict: "lab_id,user_id" },
    );

  if (membershipError) {
    return jsonError(membershipError.message, 500, { labId: lab.id });
  }

  return NextResponse.json({
    success: true,
    lab,
  });
}
