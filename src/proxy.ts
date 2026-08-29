import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isRole, ROLE_COOKIE, ROLE_HOME } from "@/lib/auth";

/**
 * Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (same runtime,
 * same execution point before rendering). This is cosmetic route gating on a
 * client-readable cookie, not a security boundary — there is no real session.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieValue = request.cookies.get(ROLE_COOKIE)?.value;
  const role = isRole(cookieValue) ? cookieValue : null;

  if (pathname === "/login") {
    if (role) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
    }
    return NextResponse.next();
  }

  if (!role) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isEmployerRoute = pathname === "/employer" || pathname.startsWith("/employer/");
  const isSharedRoute = pathname === "/demo";

  if (isEmployerRoute && role !== "employer") {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  }
  if (!isEmployerRoute && !isSharedRoute && role !== "member") {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
