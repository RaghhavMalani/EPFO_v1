import { AppStateSchema, type AppState } from "@/domain/schemas";
import { createSyntheticScenario } from "@/fixtures/synthetic-scenario";
import type { EpfoRepository } from "@/repositories/epfo-repository";

export class InMemoryEpfoRepository implements EpfoRepository {
  private state: AppState;

  constructor(initialState: AppState = createSyntheticScenario()) {
    this.state = AppStateSchema.parse(structuredClone(initialState));
  }

  getState(): AppState {
    return structuredClone(this.state);
  }

  saveState(state: AppState): void {
    this.state = AppStateSchema.parse(structuredClone(state));
  }

  reset(): AppState {
    this.state = createSyntheticScenario();
    return this.getState();
  }
}
