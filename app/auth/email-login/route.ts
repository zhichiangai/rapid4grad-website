import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getDefaultWorkspacePath,
  isSafeNextPath,
} from "@/lib/workspace/access";

type LoginBody = {
  email?: unknown;
  password?: unknown;
  next?: unknown;
};

export async function POST(request: Request) {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "login_failed" },
      { status: 400 },
    );
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const rawNextPath = typeof body.next === "string" ? body.next : null;
  const nextPath = isSafeNextPath(rawNextPath) ? rawNextPath : null;

  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: "login_failed" },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      console.warn("[auth/email-login] signInWithPassword failed", {
        operation: "signInWithPassword",
        status: 401,
        code: error?.code ?? "unknown",
      });
      return NextResponse.json(
        { success: false, error: "login_failed" },
        { status: 401 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle<{ role: string | null }>();

    return NextResponse.json({
      success: true,
      redirectTo: nextPath ?? getDefaultWorkspacePath(profile?.role),
    });
  } catch {
    console.warn("[auth/email-login] signInWithPassword request failed", {
      operation: "signInWithPassword",
      status: 500,
      code: "unexpected_error",
    });
    return NextResponse.json(
      { success: false, error: "login_failed" },
      { status: 500 },
    );
  }
}
