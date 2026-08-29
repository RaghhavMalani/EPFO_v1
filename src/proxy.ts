import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isRole, ROLE_COOKIE, ROLE_HOME } from "@/lib/auth";
import {
  SESSION_COOKIE,
  SESSION_HEADER,
  SESSION_MAX_AGE_SECONDS,
  createSessionId,
  isSessionId,
} from "@/lib/session";

/**
 * Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (same runtime,
 * same execution point before rendering). Two jobs happen here:
 *
 * 1. Every request — pages and command routes alike — is stamped with a demo session
 *    id, so each visitor gets their own scenario and one visitor's reset cannot wipe
 *    another's progress. This is the single place an id is minted.
 * 2. Cosmetic route gating on a client-readable role cookie. This is not a security
 *    boundary — there is no real session and nothing here is sensitive.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const existingSession = request.cookies.get(SESSION_COOKIE)?.value;
  const sessionId = isSessionId(existingSession) ? existingSession : createSessionId();

  // The render handling this request cannot read a cookie that this response is only
  // about to set, so the id also travels forward on a request header.
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set(SESSION_HEADER, sessionId);

  const withSession = (response: NextResponse) => {
    response.cookies.set(SESSION_COOKIE, sessionId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  };

  const next = () => withSession(NextResponse.next({ request: { headers: forwardedHeaders } }));
  const redirect = (url: URL) => withSession(NextResponse.redirect(url));

  // Command routes carry the session but are not role-gated; they were never gated
  // here, and each one validates its own body.
  if (pathname.startsWith("/api/")) {
    return next();
  }

  const cookieValue = request.cookies.get(ROLE_COOKIE)?.value;
  const role = isRole(cookieValue) ? cookieValue : null;

  if (pathname === "/login") {
    return role ? redirect(new URL(ROLE_HOME[role], request.url)) : next();
  }

  if (!role) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return redirect(loginUrl);
  }

  const isEmployerRoute = pathname === "/employer" || pathname.startsWith("/employer/");
  const isSharedRoute = pathname === "/demo";

  if (isEmployerRoute && role !== "employer") {
    return redirect(new URL(ROLE_HOME[role], request.url));
  }
  if (!isEmployerRoute && !isSharedRoute && role !== "member") {
    return redirect(new URL(ROLE_HOME[role], request.url));
  }

  return next();
}

export const config = {
  // Command routes are included so they share the visitor's session id. Without this,
  // a mutation and the render that should reflect it would land in different scenarios.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
