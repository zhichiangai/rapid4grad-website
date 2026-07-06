import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSafeNextPath } from "@/lib/workspace/access";

const OAUTH_NEXT_COOKIE = "rapid_oauth_next";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const rawNextPath = requestUrl.searchParams.get("next");
  const nextPath = isSafeNextPath(rawNextPath) ? rawNextPath : null;
  const callbackUrl = new URL("/auth/callback", requestUrl.origin);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error || !data.url) {
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set("error", "oauth_start_failed");

    if (nextPath) {
      loginUrl.searchParams.set("next", nextPath);
    }

    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.redirect(data.url);

  if (nextPath) {
    response.cookies.set(OAUTH_NEXT_COOKIE, nextPath, {
      httpOnly: true,
      maxAge: 60 * 10,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
  } else {
    response.cookies.delete(OAUTH_NEXT_COOKIE);
  }

  return response;
}
