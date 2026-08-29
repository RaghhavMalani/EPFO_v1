import type { AdvanceApplication, AdvanceState } from "@/domain/experience-v2";

/**
 * The advance progresses strictly along this sequence. `NOT_ELIGIBLE` sits outside it:
 * an ineligible advance can only re-enter the sequence by being re-evaluated by the
 * Form 31 policy engine, never by a direct transition.
 */
export const ADVANCE_SEQUENCE: AdvanceState[] = [
  "DRAFT",
  "READY",
  "SUBMITTED",
  "EPFO_PROCESSING",
  "CREDITED",
];

export function nextAdvanceState(state: AdvanceState): AdvanceState | null {
  const index = ADVANCE_SEQUENCE.indexOf(state);
  if (index === -1) return null;
  return ADVANCE_SEQUENCE[index + 1] ?? null;
}

export function transitionAdvance(
  advance: AdvanceApplication,
  nextState: AdvanceState,
  now: string,
): AdvanceApplication {
  if (advance.state === "NOT_ELIGIBLE") {
    throw new Error("An advance that is not eligible must be re-evaluated before it can move.");
  }
  if (nextState === "NOT_ELIGIBLE") {
    throw new Error("Eligibility is decided by the policy engine, not by a transition.");
  }

  const currentIndex = ADVANCE_SEQUENCE.indexOf(advance.state);
  const nextIndex = ADVANCE_SEQUENCE.indexOf(nextState);
  if (nextIndex !== currentIndex + 1) {
    throw new Error(`Advance cannot move from ${advance.state} to ${nextState}.`);
  }
  if (nextState === "READY" && !advance.eligible) {
    throw new Error("Advance cannot become ready while blocking checks remain.");
  }
  if (nextState === "SUBMITTED") {
    if (advance.requestedAmountPaise <= 0) {
      throw new Error("A requested amount is required before submission.");
    }
    if (advance.requestedAmountPaise > advance.maximumEligibleAmountPaise) {
      throw new Error("Requested amount exceeds the deterministic eligible amount.");
    }
  }

  return { ...advance, state: nextState, updatedAt: now };
}
