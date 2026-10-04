import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./lib/supabase/types";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  // In test or initial build environments without configured envs, let non-api pass
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 1. Auth Pages (/login, /register)
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  if (isAuthPage) {
    if (user) {
      // User is already logged in, redirect to dashboard
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  // 2. Protected Routes (Dashboard, Admin, Profile, Meals, etc.)
  const isPublicRoute =
    pathname.startsWith("/api/auth/register-with-invite") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico");

  if (!isPublicRoute) {
    if (!user) {
      // Unauthenticated, redirect to login
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Verify Active Profile & Role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (profile && profile.status === "disabled") {
      // Disabled account: force signout and redirect
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("error", "account_disabled");
      return NextResponse.redirect(redirectUrl);
    }

    // Admin Route Protection
    if (pathname.startsWith("/admin")) {
      if (!profile || (profile.role !== "owner" && profile.role !== "admin")) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
