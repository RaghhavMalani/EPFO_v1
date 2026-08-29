import { AppStateSchema, type AppState } from "@/domain/schemas";
import { createSyntheticScenario } from "@/fixtures/synthetic-scenario";
import type { EpfoRepository } from "@/repositories/epfo-repository";

/**
 * The working copy of one scenario for the duration of one request.
 *
 * This stays deliberately synchronous. The domain, adapters, and application
 * services read and write state many times while resolving a single command, and
 * making every one of those an awaited round trip would buy nothing — the durable
 * read and write happen once each, at the session boundary in `application/session.ts`.
 *
 * `readOnly` turns the architecture rule into a runtime one. Pages render from
 * state and never mutate it; every mutation goes through a command route. A page
 * that reaches for a mutating service method now fails immediately and loudly
 * rather than changing state that will never be persisted.
 */
export class InMemoryEpfoRepository implements EpfoRepository {
  private state: AppState;
  private dirty = false;

  constructor(
    initialState: AppState = createSyntheticScenario(),
    private readonly readOnly = false,
  ) {
    this.state = AppStateSchema.parse(structuredClone(initialState));
  }

  getState(): AppState {
    return structuredClone(this.state);
  }

  saveState(state: AppState): void {
    if (this.readOnly) {
      throw new Error(
        "This scenario was loaded for rendering and cannot be mutated. Route the change through a command route in app/api/.",
      );
    }
    this.state = AppStateSchema.parse(structuredClone(state));
    this.dirty = true;
  }

  reset(): AppState {
    if (this.readOnly) {
      throw new Error("This scenario was loaded for rendering and cannot be reset.");
    }
    this.state = createSyntheticScenario();
    this.dirty = true;
    return this.getState();
  }

  /** Whether anything actually changed, so an unchanged request skips the durable write. */
  hasUnsavedChanges(): boolean {
    return this.dirty;
  }
}
