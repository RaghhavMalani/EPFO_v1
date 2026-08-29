import { cookies, headers } from "next/headers";
import { EpfoApplicationService } from "@/application/epfo-service";
import { ExperienceV2ApplicationService } from "@/application/experience-v2-service";
import { AppStateSchema } from "@/domain/schemas";
import { SESSION_COOKIE, SESSION_HEADER, isSessionId } from "@/lib/session";
import { InMemoryEpfoRepository } from "@/repositories/in-memory-epfo-repository";
import { sessionStore } from "@/repositories/session-store-instance";
import type { SessionStore } from "@/repositories/session-store";

export type SessionServices = {
  epfoService: EpfoApplicationService;
  experienceV2Service: ExperienceV2ApplicationService;
};

/**
 * The session boundary.
 *
 * Everything above this line is synchronous and deterministic; everything below it
 * is a durable read or write. Exactly one of each happens per request: `loadSession`
 * hydrates a working copy for rendering, and `mutateSession` hydrates one, runs a
 * command against it, and persists the result before the response is returned.
 *
 * Persisting inside the request rather than after it matters here. The client calls
 * `router.refresh()` the moment a command resolves, so a write deferred past the
 * response would race the very read it needs to be visible to.
 */

/**
 * The session id for this request.
 *
 * `proxy.ts` mints it and forwards it on a request header, because a cookie set on a
 * response cannot be read back during the render producing that response. The cookie
 * is the fallback for anything the proxy matcher does not cover.
 */
export async function getSessionId(): Promise<string> {
  const requestHeaders = await headers();
  const fromProxy = requestHeaders.get(SESSION_HEADER);
  if (isSessionId(fromProxy)) {
    return fromProxy;
  }

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (isSessionId(fromCookie)) {
    return fromCookie;
  }

  // Reaching here means the proxy did not run for this request. Rather than invent an
  // id that the next request will not send back — silently stranding the visitor's
  // progress in a row nobody reads again — fail where the cause is visible.
  throw new Error(
    "No demo session was established for this request. Check that proxy.ts matches this route.",
  );
}

async function hydrate(sessionId: string, readOnly: boolean, store: SessionStore) {
  const stored = await store.read(sessionId);
  // A session with no row yet is simply a visitor who has not started, and a stored
  // scenario that no longer matches the schema is one written by an older deployment.
  // Both seed fresh from the fixtures rather than putting a judge in front of an
  // error page. The seed is not written until something actually changes it.
  const usable = stored ? AppStateSchema.safeParse(stored) : null;
  const repository = usable?.success
    ? new InMemoryEpfoRepository(usable.data, readOnly)
    : new InMemoryEpfoRepository(undefined, readOnly);

  return {
    repository,
    services: {
      epfoService: new EpfoApplicationService(repository),
      experienceV2Service: new ExperienceV2ApplicationService(repository),
    } satisfies SessionServices,
  };
}

/**
 * Loads one session's scenario for rendering. The returned services can read
 * everything and mutate nothing.
 *
 * Takes the session id explicitly so it can be exercised without a request context;
 * `loadSession` is the wrapper that resolves the id from the current request.
 */
export async function loadSessionFor(
  sessionId: string,
  store: SessionStore = sessionStore,
): Promise<SessionServices> {
  const { services } = await hydrate(sessionId, true, store);
  return services;
}

/** Loads this visitor's scenario for rendering. */
export async function loadSession(store: SessionStore = sessionStore): Promise<SessionServices> {
  return loadSessionFor(await getSessionId(), store);
}

/**
 * Runs one command against this visitor's scenario and persists the result.
 *
 * The write is skipped when the command changed nothing, so a rejected or no-op
 * command does not cost a round trip.
 */
export async function mutateSessionFor<T>(
  sessionId: string,
  command: (services: SessionServices) => T,
  store: SessionStore = sessionStore,
): Promise<T> {
  const { repository, services } = await hydrate(sessionId, false, store);

  const result = command(services);

  if (repository.hasUnsavedChanges()) {
    await store.write(sessionId, repository.getState());
  }
  return result;
}

/** Runs one command against this visitor's scenario and persists the result. */
export async function mutateSession<T>(
  command: (services: SessionServices) => T,
  store: SessionStore = sessionStore,
): Promise<T> {
  return mutateSessionFor(await getSessionId(), command, store);
}

/** Drops this visitor's scenario so their next request reseeds from the fixtures. */
export async function clearSession(store: SessionStore = sessionStore): Promise<void> {
  await store.clear(await getSessionId());
}
