import type { AppState } from "@/domain/schemas";

export interface EpfoRepository {
  getState(): AppState;
  saveState(state: AppState): void;
  reset(): AppState;
}
