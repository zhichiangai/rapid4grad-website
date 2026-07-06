import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getDefaultWorkspacePath,
  isSafeNextPath,
} from "@/lib/workspace/access";

const OAUTH_NEXT_COOKIE = "rapid_oauth_next";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawNextPath = requestUrl.searchParams.get("next");
  const cookieNextPath = request.cookies.get(OAUTH_NEXT_COOKIE)?.value ?? null;
  const nextPath = isSafeNextPath(rawNextPath)
    ? rawNextPath
    : isSafeNextPath(cookieNextPath)
      ? cookieNextPath
      : null;
  const origin = requestUrl.origin;

  if (!code) {
    const response = NextResponse.redirect(`${origin}/login?error=missing_code`);
    response.cookies.delete(OAUTH_NEXT_COOKIE);
    return response;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const response = NextResponse.redirect(
      `${origin}/login?error=oauth_callback_failed`,
    );
    response.cookies.delete(OAUTH_NEXT_COOKIE);
    return response;
  }

  if (nextPath) {
    const response = NextResponse.redirect(new URL(nextPath, request.url));
    response.cookies.delete(OAUTH_NEXT_COOKIE);
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const response = NextResponse.redirect(`${origin}/dashboard`);
    response.cookies.delete(OAUTH_NEXT_COOKIE);
    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null }>();

  const response = NextResponse.redirect(
    new URL(getDefaultWorkspacePath(profile?.role), request.url),
  );
  response.cookies.delete(OAUTH_NEXT_COOKIE);
  return response;
}
