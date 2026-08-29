import { MemorySessionStore, type SessionStore } from "@/repositories/session-store";
import { SupabaseSessionStore } from "@/repositories/supabase-session-store";

/**
 * Raised when a production deployment has no durable session storage configured.
 *
 * This is a deployment fault rather than a request fault, so it is distinguished from
 * ordinary workflow errors and answered with a 5xx.
 */
export class SessionStoreConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionStoreConfigurationError";
  }
}

export type SessionStoreEnvironment = {
  supabaseUrl: string | undefined;
  supabaseServiceRoleKey: string | undefined;
  nodeEnv: string | undefined;
};

/**
 * Chooses a session driver, or refuses to start.
 *
 * The memory driver is correct for `next dev`, the tests, and a single-process
 * `next start`. It is wrong for any deployment that runs more than one instance,
 * because each instance would hold a different copy of the map — and the symptom is
 * not an error, it is two visitors quietly overwriting each other's scenario. That
 * is not something to discover in front of an audience, so production refuses to run
 * on it rather than warning into a log nobody is reading.
 *
 * Kept pure and env-injected so the rule itself is directly testable.
 */
export function createSessionStore(env: SessionStoreEnvironment): SessionStore {
  const { supabaseUrl, supabaseServiceRoleKey, nodeEnv } = env;

  if (supabaseUrl && supabaseServiceRoleKey) {
    return SupabaseSessionStore.fromEnvironment(supabaseUrl, supabaseServiceRoleKey);
  }

  // Naming which variables are absent matters: setting one and typo-ing the other is a
  // far likelier mistake than setting neither, and it looks identical from the outside.
  const missing = [
    supabaseUrl ? null : "SUPABASE_URL",
    supabaseServiceRoleKey ? null : "SUPABASE_SERVICE_ROLE_KEY",
  ].filter((name): name is string => name !== null);

  if (nodeEnv === "production") {
    throw new SessionStoreConfigurationError(
      `Durable session storage is required in production, but ${missing.join(" and ")} ` +
        `${missing.length === 1 ? "is" : "are"} not set. Without it, each serverless instance ` +
        "keeps its own copy of the scenario, so visitors overwrite each other and progress is " +
        "lost between requests. Configure the Supabase session store before deploying.",
    );
  }

  if (missing.length === 1) {
    console.warn(
      `[epfo-one] ${missing[0]} is not set, so session state is process-local. ` +
        "This is fine for development, and would fail to start in production.",
    );
  }

  return new MemorySessionStore();
}

const globalStore = globalThis as unknown as { epfoOneSessionStore?: SessionStore };

/**
 * The process-wide session store.
 *
 * Resolved on first use rather than at module load: `next build` also runs with
 * `NODE_ENV=production`, and a build should not need deployment secrets to succeed.
 * Deferring also means a misconfiguration surfaces per request, with a message, rather
 * than as an opaque module-evaluation failure.
 *
 * A failed resolution is never cached, so fixing the environment and retrying works.
 */
export function getSessionStore(): SessionStore {
  globalStore.epfoOneSessionStore ??= createSessionStore({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    nodeEnv: process.env.NODE_ENV,
  });
  return globalStore.epfoOneSessionStore;
}
