import { beforeEach, describe, expect, it } from "vitest";
import { loadSessionFor, mutateSessionFor } from "@/application/session";
import { MemorySessionStore } from "@/repositories/session-store";
import { isSessionId, createSessionId } from "@/lib/session";

/**
 * These cover the isolation guarantee itself, not the domain rules underneath it:
 * two visitors must never observe or overwrite each other's scenario, and a mutation
 * must be durable by the time the command route responds — the render that follows
 * a `router.refresh()` has to see it.
 */
describe("demo session isolation", () => {
  let store: MemorySessionStore;
  const judgeA = createSessionId();
  const judgeB = createSessionId();

  beforeEach(() => {
    store = new MemorySessionStore();
  });

  /** Drives the two-step member self-service Mark Exit, taking readiness from 5/7 to 6/7. */
  const markExit = (sessionId: string) =>
    mutateSessionFor(sessionId, ({ epfoService }) => {
      epfoService.startMarkExit("issue-exit-date");
      return epfoService.completeMarkExit("issue-exit-date");
    }, store);

  it("mints session ids that survive a round trip through the cookie validator", () => {
    expect(isSessionId(createSessionId())).toBe(true);
    expect(isSessionId("../../etc/passwd")).toBe(false);
    expect(isSessionId(undefined)).toBe(false);
    expect(isSessionId("")).toBe(false);
  });

  it("seeds an unseen session from the fixtures without writing anything", async () => {
    const { epfoService } = await loadSessionFor(judgeA, store);
    expect(epfoService.getSnapshot().readiness.passedCount).toBe(5);
    // Reading alone must not create a row; only a real change is worth persisting.
    expect(await store.read(judgeA)).toBeNull();
  });

  it("persists a mutation so the very next read observes it", async () => {
    await markExit(judgeA);

    const { epfoService } = await loadSessionFor(judgeA, store);
    expect(epfoService.getSnapshot().readiness.passedCount).toBe(6);
  });

  it("keeps one visitor's progress invisible to another", async () => {
    await markExit(judgeA);

    const a = await loadSessionFor(judgeA, store);
    const b = await loadSessionFor(judgeB, store);

    expect(a.epfoService.getSnapshot().readiness.passedCount).toBe(6);
    expect(b.epfoService.getSnapshot().readiness.passedCount).toBe(5);
  });

  it("scopes a reset to the visitor who asked for it", async () => {
    await markExit(judgeA);
    await markExit(judgeB);

    await mutateSessionFor(judgeA, ({ epfoService }) => epfoService.reset(), store);

    const a = await loadSessionFor(judgeA, store);
    const b = await loadSessionFor(judgeB, store);

    expect(a.epfoService.getSnapshot().readiness.passedCount).toBe(5);
    expect(b.epfoService.getSnapshot().readiness.passedCount).toBe(6);
  });

  it("refuses to mutate a scenario that was loaded for rendering", async () => {
    const { epfoService } = await loadSessionFor(judgeA, store);
    expect(() => epfoService.startMarkExit("issue-exit-date")).toThrow(/cannot be mutated/);
    expect(await store.read(judgeA)).toBeNull();
  });

  it("skips the durable write when a command changes nothing", async () => {
    let writes = 0;
    const counting = new Proxy(store, {
      get(target, property, receiver) {
        if (property === "write") {
          return async (...args: Parameters<MemorySessionStore["write"]>) => {
            writes += 1;
            return target.write(...args);
          };
        }
        return Reflect.get(target, property, receiver);
      },
    });

    await mutateSessionFor(judgeA, ({ epfoService }) => epfoService.getSnapshot(), counting);
    expect(writes).toBe(0);

    await mutateSessionFor(judgeA, ({ epfoService }) => epfoService.completePreflight(), counting);
    expect(writes).toBe(1);
  });

  it("reseeds a session whose stored scenario is unreadable", async () => {
    // Simulates a row written by an older deployment whose shape no longer parses.
    const corrupt = new MemorySessionStore();
    await corrupt.write(judgeA, { notAnAppState: true } as never);

    const { epfoService } = await loadSessionFor(judgeA, corrupt);
    expect(epfoService.getSnapshot().readiness.passedCount).toBe(5);
  });
});
