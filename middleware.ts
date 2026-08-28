import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

function isProtectedPath(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isProfessorPath(pathname: string) {
  return pathname === "/professor" || pathname.startsWith("/professor/");
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = isProtectedPath(pathname) || isAdminPath(pathname) || isProfessorPath(pathname);

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (!user) {
    return supabaseResponse;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role,account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "profile_unavailable");
    return NextResponse.redirect(redirectUrl);
  }

  if (profile.account_status !== "active") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/account-suspended";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminPath(pathname) && profile.role !== "admin") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = profile.role === "professor" ? "/professor/dashboard" : "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (isProfessorPath(pathname)) {
    if (profile.role === "student") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (isProtectedPath(pathname)) {
    if (profile.role === "professor" && pathname.startsWith("/dashboard")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/professor/dashboard";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/professor/:path*"],
};
