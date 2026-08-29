import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppStateSchema, type AppState } from "@/domain/schemas";
import type { SessionStore } from "@/repositories/session-store";

export const SESSION_TABLE = "demo_sessions";

/**
 * Durable per-session storage in Postgres.
 *
 * Reached with the service-role key from server-side code only, so the table needs
 * no anonymous access and Row Level Security can stay fully closed. Nothing here is
 * sensitive — every row is synthetic scenario data — but a demo session is still
 * private to the visitor holding its cookie, and an open table would let one
 * visitor read or overwrite another's run.
 *
 * A row that fails schema validation is treated as absent rather than thrown: a
 * scenario written by an older deployment should reseed cleanly instead of putting
 * a judge in front of an error page.
 */
export class SupabaseSessionStore implements SessionStore {
  readonly driver = "supabase";

  constructor(private readonly client: SupabaseClient) {}

  static fromEnvironment(url: string, serviceRoleKey: string): SupabaseSessionStore {
    return new SupabaseSessionStore(
      createClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    );
  }

  async read(sessionId: string): Promise<AppState | null> {
    const { data, error } = await this.client
      .from(SESSION_TABLE)
      .select("state")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error) {
      throw new Error(`Could not read demo session: ${error.message}`);
    }
    if (!data?.state) {
      return null;
    }

    const parsed = AppStateSchema.safeParse(data.state);
    return parsed.success ? parsed.data : null;
  }

  async write(sessionId: string, state: AppState): Promise<void> {
    const { error } = await this.client
      .from(SESSION_TABLE)
      .upsert(
        { session_id: sessionId, state, updated_at: new Date().toISOString() },
        { onConflict: "session_id" },
      );

    if (error) {
      throw new Error(`Could not save demo session: ${error.message}`);
    }
  }

  async clear(sessionId: string): Promise<void> {
    const { error } = await this.client
      .from(SESSION_TABLE)
      .delete()
      .eq("session_id", sessionId);

    if (error) {
      throw new Error(`Could not reset demo session: ${error.message}`);
    }
  }
}
