import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getDefaultWorkspacePath,
  isSafeNextPath,
} from "@/lib/workspace/access";

type SignupBody = {
  email?: unknown;
  password?: unknown;
  next?: unknown;
};

export async function POST(request: Request) {
  let body: SignupBody;

  try {
    body = (await request.json()) as SignupBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "signup_failed" },
      { status: 400 },
    );
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const rawNextPath = typeof body.next === "string" ? body.next : null;
  const nextPath = isSafeNextPath(rawNextPath) ? rawNextPath : null;

  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: "signup_failed" },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { success: false, error: "signup_failed" },
        { status: 400 },
      );
    }

    if (!data.session) {
      return NextResponse.json({
        success: true,
        confirmationRequired: true,
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle<{ role: string | null }>();

    return NextResponse.json({
      success: true,
      confirmationRequired: false,
      redirectTo: nextPath ?? getDefaultWorkspacePath(profile?.role),
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "signup_failed" },
      { status: 500 },
    );
  }
}
