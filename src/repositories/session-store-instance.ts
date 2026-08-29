import { MemorySessionStore, type SessionStore } from "@/repositories/session-store";
import { SupabaseSessionStore } from "@/repositories/supabase-session-store";

const globalStore = globalThis as unknown as { epfoOneSessionStore?: SessionStore };

function selectStore(): SessionStore {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && serviceRoleKey) {
    return SupabaseSessionStore.fromEnvironment(url, serviceRoleKey);
  }

  // Deliberately loud. A multi-instance deployment running on the memory driver
  // looks fine until two people use it at once, which is the worst moment to find out.
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[epfo-one] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set. Falling back to " +
        "process-local session storage, which is not durable across serverless instances. " +
        "Concurrent visitors may see each other's scenario or lose progress between requests.",
    );
  }
  return new MemorySessionStore();
}

/** One client per process. The Supabase client is cheap to hold and expensive to rebuild per request. */
export const sessionStore: SessionStore = globalStore.epfoOneSessionStore ?? selectStore();
globalStore.epfoOneSessionStore = sessionStore;
