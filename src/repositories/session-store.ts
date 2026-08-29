import type { AppState } from "@/domain/schemas";

/**
 * Durable storage for one demo session's scenario.
 *
 * The whole `AppState` is stored as a single document. It is roughly 28 KB of JSON
 * and is always read and written whole, so there is nothing to gain from splitting
 * it into tables — and a lot to lose, since a partially written scenario would put
 * the deterministic engines in a state the fixtures can never produce.
 */
export interface SessionStore {
  /** The scenario for this session, or `null` if the session has not been seeded yet. */
  read(sessionId: string): Promise<AppState | null>;
  write(sessionId: string, state: AppState): Promise<void>;
  /** Drops the session so the next read reseeds it from the fixtures. */
  clear(sessionId: string): Promise<void>;
  /** Shown on `/demo` so it is obvious which driver a deployment is actually running. */
  readonly driver: string;
}

/**
 * Process-local fallback driver.
 *
 * This is correct for `next dev`, for the test suite, and for a single-process
 * `next start`. It is NOT correct on a platform that runs several instances of the
 * app, because each instance would hold a different copy of the map — which is
 * exactly the failure this whole module exists to remove. Production should
 * configure the Supabase driver; `session-store-instance.ts` says so out loud
 * when it falls back to this one.
 *
 * Sharing one instance across Next.js's separately compiled chunks is
 * `session-store-instance.ts`'s job, not this class's — so each instance owns its
 * own map and two instances are genuinely independent.
 */
export class MemorySessionStore implements SessionStore {
  readonly driver = "memory";

  private readonly states = new Map<string, AppState>();

  async read(sessionId: string): Promise<AppState | null> {
    const state = this.states.get(sessionId);
    return state ? structuredClone(state) : null;
  }

  async write(sessionId: string, state: AppState): Promise<void> {
    this.states.set(sessionId, structuredClone(state));
  }

  async clear(sessionId: string): Promise<void> {
    this.states.delete(sessionId);
  }
}
