import { describe, expect, it, vi } from "vitest";
import {
  SessionStoreConfigurationError,
  createSessionStore,
  type SessionStoreEnvironment,
} from "@/repositories/session-store-instance";

/**
 * The rule this protects: production must never run on process-local session storage.
 *
 * Its failure mode is silent — several serverless instances each keep their own copy
 * of the scenario, so visitors overwrite each other and progress vanishes between
 * requests, with nothing in the logs to explain it. Refusing to start is the only
 * signal that arrives before a demo rather than during one.
 */

const CONFIGURED = {
  supabaseUrl: "https://example.supabase.co",
  supabaseServiceRoleKey: "service-role-key",
};

const env = (overrides: Partial<SessionStoreEnvironment>): SessionStoreEnvironment => ({
  supabaseUrl: undefined,
  supabaseServiceRoleKey: undefined,
  nodeEnv: undefined,
  ...overrides,
});

describe("session store configuration", () => {
  it("uses the durable driver whenever Supabase is configured", () => {
    for (const nodeEnv of ["production", "development", "test", undefined]) {
      expect(createSessionStore(env({ ...CONFIGURED, nodeEnv })).driver).toBe("supabase");
    }
  });

  it("refuses to start in production with no Supabase configuration", () => {
    expect(() => createSessionStore(env({ nodeEnv: "production" }))).toThrow(
      SessionStoreConfigurationError,
    );
  });

  it.each([
    ["only the URL is set", { supabaseUrl: CONFIGURED.supabaseUrl }, "SUPABASE_SERVICE_ROLE_KEY"],
    [
      "only the key is set",
      { supabaseServiceRoleKey: CONFIGURED.supabaseServiceRoleKey },
      "SUPABASE_URL",
    ],
  ])("refuses to start in production when %s, naming what is absent", (_case, partial, missing) => {
    // Half-configured is the likelier real mistake, and from the outside it looks
    // identical to configuring nothing — so the message has to say which one is absent.
    expect(() => createSessionStore(env({ ...partial, nodeEnv: "production" }))).toThrow(missing);
  });

  it("never silently falls back to process-local storage in production", () => {
    for (const partial of [{}, { supabaseUrl: CONFIGURED.supabaseUrl }, { supabaseServiceRoleKey: "k" }]) {
      let driver: string | null = null;
      try {
        driver = createSessionStore(env({ ...partial, nodeEnv: "production" })).driver;
      } catch {
        // Refusing to start is the intended outcome.
      }
      expect(driver).not.toBe("memory");
    }
  });

  it("explains the consequence, not just the missing variable", () => {
    expect(() => createSessionStore(env({ nodeEnv: "production" }))).toThrow(
      /required in production/i,
    );
    expect(() => createSessionStore(env({ nodeEnv: "production" }))).toThrow(
      /overwrite each other|lost between requests/i,
    );
  });

  it.each(["development", "test", undefined])(
    "still allows process-local storage when NODE_ENV is %s",
    (nodeEnv) => {
      expect(createSessionStore(env({ nodeEnv })).driver).toBe("memory");
    },
  );

  it("warns in development when only half the configuration is present", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const store = createSessionStore(env({ supabaseUrl: CONFIGURED.supabaseUrl, nodeEnv: "development" }));
      expect(store.driver).toBe("memory");
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("SUPABASE_SERVICE_ROLE_KEY"));
    } finally {
      warn.mockRestore();
    }
  });

  it("stays quiet in development when nothing is configured, which is the normal case", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(createSessionStore(env({ nodeEnv: "development" })).driver).toBe("memory");
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
