/**
 * Cosmetic mock authentication only. There is no real credential store — the two
 * identities and password are shown on the login screen itself. This module is the
 * single source of truth for the cookie name, valid roles, and demo password so the
 * login route, sign-out route, and proxy stay in agreement.
 */

export const ROLE_COOKIE = "epfo-one-role";
export const DEMO_PASSWORD = "demo1234";

export type Role = "member" | "employer";

export function isRole(value: string | undefined | null): value is Role {
  return value === "member" || value === "employer";
}

export const ROLE_HOME: Record<Role, string> = {
  member: "/",
  employer: "/employer",
};
