/**
 * Demo session identity.
 *
 * Every visitor gets their own scenario. The id is minted once in `proxy.ts` and
 * travels two ways on the same request: as a `Set-Cookie` for every later request,
 * and as a request header so the render that mints it can already use it — a cookie
 * set on a response is not readable from the render producing that response.
 *
 * This is not authentication. It scopes synthetic demo state so two judges clicking
 * through at the same time never collide, and so one judge's reset cannot wipe
 * another's progress. `lib/auth.ts` still owns the role cookie.
 */

export const SESSION_COOKIE = "epfo-one-session";
export const SESSION_HEADER = "x-epfo-one-session";

/** How long an idle demo session survives. Long enough for a judging slot, short enough to expire on its own. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function createSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Session ids are used as a primary key, so anything that did not come from
 * `createSessionId` is rejected rather than trusted from a client-supplied cookie.
 */
export function isSessionId(value: string | undefined | null): value is string {
  return typeof value === "string" && SESSION_ID_PATTERN.test(value);
}
