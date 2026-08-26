import type { AuditContext } from "@/domain/audit";
import { transitionClaim } from "@/domain/claim-machine";
import { runPreflight } from "@/domain/preflight";
import type { AppState, ClaimState } from "@/domain/schemas";

const ACTOR_BY_STATE: Record<
  ClaimState,
  { actorType: "PROCESSOR" | "BANK"; actorName: string }
> = {
  DRAFT: { actorType: "PROCESSOR", actorName: "EPFO One · Simulation" },
  READY: { actorType: "PROCESSOR", actorName: "EPFO One · Simulation" },
  SUBMITTED: { actorType: "PROCESSOR", actorName: "EPFO Processing · Simulation" },
  ELIGIBILITY_VERIFIED: {
    actorType: "PROCESSOR",
    actorName: "Eligibility Engine · Simulation",
  },
  RECORDS_VERIFIED: {
    actorType: "PROCESSOR",
    actorName: "Records Processing · Simulation",
  },
  APPROVED: { actorType: "PROCESSOR", actorName: "EPFO Processing · Simulation" },
  PAYMENT_INSTRUCTION_CREATED: {
    actorType: "PROCESSOR",
    actorName: "EPFO Payments · Simulation",
  },
  BANK_PROCESSING: { actorType: "BANK", actorName: "Demo Bank · Simulation" },
  CREDITED: { actorType: "BANK", actorName: "Demo Bank · Simulation" },
};

export class MockClaimProcessorAdapter {
  advance(state: AppState, nextState: ClaimState, context: AuditContext): AppState {
    const actor = ACTOR_BY_STATE[nextState];
    const result = transitionClaim(
      {
        claim: state.claim,
        nextState,
        checks: runPreflight(state.member),
        actorType: actor.actorType,
        actorName: actor.actorName,
      },
      context,
    );

    return {
      ...state,
      claim: result.claim,
      auditEvents: [...state.auditEvents, result.auditEvent],
    };
  }
}
