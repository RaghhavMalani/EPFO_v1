import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SESSION_TABLE, SupabaseSessionStore } from "@/repositories/supabase-session-store";
import { InMemoryEpfoRepository } from "@/repositories/in-memory-epfo-repository";

/**
 * The Supabase driver is the one piece that cannot run in CI, so it is exercised
 * against a recorded client instead: the query shape it builds, and — more
 * importantly — that every failure mode degrades the way the session boundary
 * expects rather than throwing a judge onto an error page.
 */

type Call = { method: string; args: unknown[] };

function fakeClient(outcome: { data?: unknown; error?: { message: string } }) {
  const calls: Call[] = [];
  const record = (method: string, ...args: unknown[]) => {
    calls.push({ method, args });
    return builder;
  };
  const builder = {
    select: (...args: unknown[]) => record("select", ...args),
    eq: (...args: unknown[]) => record("eq", ...args),
    upsert: (...args: unknown[]) => record("upsert", ...args),
    delete: (...args: unknown[]) => record("delete", ...args),
    maybeSingle: async () => outcome,
    // A terminal builder is awaited directly for write operations.
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(outcome).then(resolve),
  };
  const client = {
    from: (...args: unknown[]) => record("from", ...args),
  } as unknown as SupabaseClient;
  return { client, calls };
}

const scenario = new InMemoryEpfoRepository().getState();

describe("supabase session store", () => {
  it("reads one session by primary key from the demo_sessions table", async () => {
    const { client, calls } = fakeClient({ data: { state: scenario } });
    const state = await new SupabaseSessionStore(client).read("session-a");

    expect(state?.member.name).toBe(scenario.member.name);
    expect(calls.map((call) => call.method)).toEqual(["from", "select", "eq"]);
    expect(calls[0].args[0]).toBe(SESSION_TABLE);
    expect(calls[2].args).toEqual(["session_id", "session-a"]);
  });

  it("treats a session with no row as unseeded rather than as an error", async () => {
    const { client } = fakeClient({ data: null });
    expect(await new SupabaseSessionStore(client).read("unknown")).toBeNull();
  });

  it("treats a row written by an older deployment as unseeded", async () => {
    // Returning null here is what lets the session boundary reseed from the fixtures
    // instead of surfacing a schema error mid-demo.
    const { client } = fakeClient({ data: { state: { shape: "from an older build" } } });
    expect(await new SupabaseSessionStore(client).read("stale")).toBeNull();
  });

  it("upserts on the session id so a returning visitor replaces their own row", async () => {
    const { client, calls } = fakeClient({ error: undefined });
    await new SupabaseSessionStore(client).write("session-a", scenario);

    const upsert = calls.find((call) => call.method === "upsert");
    expect(upsert?.args[1]).toEqual({ onConflict: "session_id" });
    const row = upsert?.args[0] as { session_id: string; updated_at: string };
    expect(row.session_id).toBe("session-a");
    expect(Number.isNaN(Date.parse(row.updated_at))).toBe(false);
  });

  it("deletes only the session it was asked to clear", async () => {
    const { client, calls } = fakeClient({ error: undefined });
    await new SupabaseSessionStore(client).clear("session-a");

    expect(calls.map((call) => call.method)).toEqual(["from", "delete", "eq"]);
    expect(calls[2].args).toEqual(["session_id", "session-a"]);
  });

  it("surfaces a genuine database failure instead of silently losing progress", async () => {
    const failing = fakeClient({ error: { message: "connection refused" } });
    const store = new SupabaseSessionStore(failing.client);

    await expect(store.read("session-a")).rejects.toThrow(/connection refused/);
    await expect(store.write("session-a", scenario)).rejects.toThrow(/connection refused/);
    await expect(store.clear("session-a")).rejects.toThrow(/connection refused/);
  });
});
