import type { TransferApplication, TransferState } from "@/domain/experience-v2";

export const TRANSFER_SEQUENCE: TransferState[] = [
  "DRAFT",
  "READY",
  "SUBMITTED",
  "PREVIOUS_RECORD_VERIFIED",
  "CURRENT_RECORD_VERIFIED",
  "EPFO_PROCESSING",
  "BALANCE_MOVED",
  "COMPLETED",
];

export function transitionTransfer(
  transfer: TransferApplication,
  nextState: TransferState,
  now: string,
): TransferApplication {
  const currentIndex = TRANSFER_SEQUENCE.indexOf(transfer.state);
  const nextIndex = TRANSFER_SEQUENCE.indexOf(nextState);
  if (nextIndex !== currentIndex + 1) {
    throw new Error(`Transfer cannot move from ${transfer.state} to ${nextState}.`);
  }
  if (nextState === "READY" && transfer.checks.some((check) => check.status === "BLOCK")) {
    throw new Error("Transfer cannot become ready while blocking checks remain.");
  }
  return {
    ...transfer,
    state: nextState,
    submittedAt: nextState === "SUBMITTED" ? now : transfer.submittedAt,
    updatedAt: now,
  };
}
