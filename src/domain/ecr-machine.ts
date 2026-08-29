import { ecrRowsAreClear } from "@/domain/ecr-engine";
import type { EcrRow, EcrState, EcrSubmission } from "@/domain/experience-v2";

const ALLOWED_TRANSITIONS: Record<EcrState, EcrState[]> = {
  DRAFT: ["VALIDATION_FAILED", "READY"],
  VALIDATION_FAILED: ["VALIDATION_FAILED", "READY"],
  READY: ["VALIDATION_FAILED", "READY", "CHALLAN_GENERATED"],
  CHALLAN_GENERATED: ["PAYMENT_PROCESSING"],
  PAYMENT_PROCESSING: ["PAID"],
  PAID: [],
};

export function canTransitionEcr(from: EcrState, to: EcrState) {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** The state a file lands in from its rows alone: clear rows are READY, anything else failed validation. */
export function deriveEcrValidationState(rows: EcrRow[]): EcrState {
  return ecrRowsAreClear(rows) ? "READY" : "VALIDATION_FAILED";
}

export function transitionEcr(ecr: EcrSubmission, nextState: EcrState, now: string): EcrSubmission {
  if (!canTransitionEcr(ecr.state, nextState)) {
    throw new Error(`ECR cannot move from ${ecr.state} to ${nextState}.`);
  }
  if (nextState === "CHALLAN_GENERATED" && !ecrRowsAreClear(ecr.rows)) {
    throw new Error("Resolve all ECR issues before generating a challan.");
  }
  return { ...ecr, state: nextState, updatedAt: now };
}
