import { createAuditEvent, type AuditContext } from "@/domain/audit";
import type {
  ActorType,
  AuditEvent,
  Claim,
  ClaimState,
  PreflightCheck,
} from "@/domain/schemas";
import { hasBlockingChecks } from "@/domain/preflight";

export const CLAIM_SEQUENCE: ClaimState[] = [
  "DRAFT",
  "READY",
  "SUBMITTED",
  "ELIGIBILITY_VERIFIED",
  "RECORDS_VERIFIED",
  "APPROVED",
  "PAYMENT_INSTRUCTION_CREATED",
  "BANK_PROCESSING",
  "CREDITED",
];

const CLAIM_EVENT_TYPES: Record<ClaimState, string> = {
  DRAFT: "CLAIM_DRAFTED",
  READY: "CLAIM_READY",
  SUBMITTED: "CLAIM_SUBMITTED",
  ELIGIBILITY_VERIFIED: "CLAIM_ELIGIBILITY_VERIFIED",
  RECORDS_VERIFIED: "CLAIM_RECORDS_VERIFIED",
  APPROVED: "CLAIM_APPROVED",
  PAYMENT_INSTRUCTION_CREATED: "PAYMENT_INSTRUCTION_CREATED",
  BANK_PROCESSING: "PAYMENT_SENT_TO_BANK",
  CREDITED: "PAYMENT_CREDITED",
};

type ClaimTransitionInput = {
  claim: Claim;
  nextState: ClaimState;
  checks: PreflightCheck[];
  confirmed?: boolean;
  actorType: ActorType;
  actorName: string;
};

export function transitionClaim(
  input: ClaimTransitionInput,
  context: AuditContext,
): { claim: Claim; auditEvent: AuditEvent } {
  const currentIndex = CLAIM_SEQUENCE.indexOf(input.claim.state);
  const expectedNext = CLAIM_SEQUENCE[currentIndex + 1];

  if (input.nextState !== expectedNext) {
    throw new Error(`Claim cannot move from ${input.claim.state} to ${input.nextState}.`);
  }
  if (input.claim.state === "DRAFT" && hasBlockingChecks(input.checks)) {
    throw new Error("Claim cannot become READY while preflight blockers remain.");
  }
  if (input.claim.state === "READY" && input.nextState === "SUBMITTED" && !input.confirmed) {
    throw new Error("Claim submission requires explicit user confirmation.");
  }

  const timestamp = context.now().toISOString();
  const claim: Claim = {
    ...input.claim,
    state: input.nextState,
    updatedAt: timestamp,
    stateHistory: [
      ...input.claim.stateHistory,
      {
        state: input.nextState,
        timestamp,
        actorType: input.actorType,
        actorName: input.actorName,
      },
    ],
  };

  const aggregateType = input.nextState === "CREDITED" ? "PAYMENT" : "CLAIM";

  return {
    claim,
    auditEvent: createAuditEvent(
      {
        aggregateType,
        aggregateId: input.claim.id,
        eventType: CLAIM_EVENT_TYPES[input.nextState],
        actorType: input.actorType,
        actorName: input.actorName,
        metadata: {
          from: input.claim.state,
          to: input.nextState,
          amountPaise: input.claim.requestedAmountPaise,
        },
      },
      context,
    ),
  };
}
