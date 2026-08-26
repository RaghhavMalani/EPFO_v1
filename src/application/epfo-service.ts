import {
  EmployerWorkflowAdapter,
  type EmployerDecision,
} from "@/adapters/employer-workflow-adapter";
import { MemberSelfServiceAdapter } from "@/adapters/member-self-service-adapter";
import { MockClaimProcessorAdapter } from "@/adapters/mock-claim-processor-adapter";
import { createAuditEvent, type AuditContext } from "@/domain/audit";
import { transitionClaim } from "@/domain/claim-machine";
import { hasBlockingChecks, runPreflight } from "@/domain/preflight";
import { calculateReadiness, type ReadinessResult } from "@/domain/readiness";
import {
  routeResolution,
  type ResolutionRoute,
} from "@/domain/resolution-router";
import type { AppState, ClaimState, PreflightCheck } from "@/domain/schemas";
import {
  determineWithdrawalService,
  type WithdrawalServiceDecision,
} from "@/domain/withdrawal-service";
import type { EpfoRepository } from "@/repositories/epfo-repository";

export type ApplicationSnapshot = AppState & {
  preflight: PreflightCheck[];
  readiness: ReadinessResult;
  issueResolutions: ResolutionRoute[];
  withdrawalService: WithdrawalServiceDecision;
};

export class EpfoApplicationService {
  private readonly context: AuditContext;
  private readonly selfServiceAdapter = new MemberSelfServiceAdapter();
  private readonly employerAdapter = new EmployerWorkflowAdapter();
  private readonly claimAdapter = new MockClaimProcessorAdapter();

  constructor(
    private readonly repository: EpfoRepository,
    now: () => Date = () => new Date(),
    createId: (prefix: string) => string = (prefix) => `${prefix}-${crypto.randomUUID()}`,
  ) {
    this.context = { now, createId };
  }

  getSnapshot(): ApplicationSnapshot {
    const state = this.repository.getState();
    const preflight = runPreflight(state.member);
    return {
      ...state,
      preflight,
      readiness: calculateReadiness(preflight),
      issueResolutions: state.issues.map((issue) => routeResolution(issue, state.member)),
      withdrawalService: determineWithdrawalService(state.member),
    };
  }

  completePreflight(): ApplicationSnapshot {
    const state = this.repository.getState();
    const checks = runPreflight(state.member);
    const readiness = calculateReadiness(checks);
    state.auditEvents.push(
      createAuditEvent(
        {
          aggregateType: "MEMBER",
          aggregateId: state.member.id,
          eventType: "PREFLIGHT_COMPLETED",
          actorType: "SYSTEM",
          actorName: "Claim Preflight",
          metadata: {
            passedCount: readiness.passedCount,
            totalChecks: readiness.totalChecks,
            readiness: readiness.percentage,
          },
        },
        this.context,
      ),
    );
    this.repository.saveState(state);
    return this.getSnapshot();
  }

  startMarkExit(issueId: string): ApplicationSnapshot {
    const state = this.selfServiceAdapter.startMarkExit(
      this.repository.getState(),
      issueId,
      this.context,
    );
    this.repository.saveState(state);
    return this.getSnapshot();
  }

  completeMarkExit(issueId: string): ApplicationSnapshot {
    let state = this.selfServiceAdapter.completeMarkExit(
      this.repository.getState(),
      issueId,
      this.context,
    );
    state = this.reevaluatePreflight(state, "MARK_EXIT_COMPLETED");
    state = this.synchronizeClaimReadiness(state);
    this.repository.saveState(state);
    return this.getSnapshot();
  }

  createEmployerRequest(issueId: string): ApplicationSnapshot {
    const state = this.employerAdapter.createRequest(
      this.repository.getState(),
      issueId,
      this.context,
    );
    this.repository.saveState(state);
    return this.getSnapshot();
  }

  resubmitEmployerRequest(issueId: string): ApplicationSnapshot {
    const state = this.employerAdapter.resubmit(
      this.repository.getState(),
      issueId,
      this.context,
    );
    this.repository.saveState(state);
    return this.getSnapshot();
  }

  actOnEmployerRequest(
    requestId: string,
    decision: EmployerDecision,
    reason?: string,
  ): ApplicationSnapshot {
    let state = this.employerAdapter.decide(
      this.repository.getState(),
      requestId,
      decision,
      reason,
      this.context,
    );
    if (decision === "APPROVE") {
      state = this.reevaluatePreflight(state, "EMPLOYER_REQUEST_APPROVED");
      state = this.synchronizeClaimReadiness(state);
    }
    this.repository.saveState(state);
    return this.getSnapshot();
  }

  submitClaim(confirmed: boolean): ApplicationSnapshot {
    const state = this.repository.getState();
    const result = transitionClaim(
      {
        claim: state.claim,
        nextState: "SUBMITTED",
        checks: runPreflight(state.member),
        confirmed,
        actorType: "CITIZEN",
        actorName: state.member.name,
      },
      this.context,
    );
    state.claim = result.claim;
    state.auditEvents.push(result.auditEvent);
    this.repository.saveState(state);
    return this.getSnapshot();
  }

  advanceClaim(nextState: ClaimState): ApplicationSnapshot {
    const state = this.claimAdapter.advance(
      this.repository.getState(),
      nextState,
      this.context,
    );
    this.repository.saveState(state);
    return this.getSnapshot();
  }

  reset(): ApplicationSnapshot {
    this.repository.reset();
    return this.getSnapshot();
  }

  private reevaluatePreflight(state: AppState, trigger: string): AppState {
    const readiness = calculateReadiness(runPreflight(state.member));
    return {
      ...state,
      auditEvents: [
        ...state.auditEvents,
        createAuditEvent(
          {
            aggregateType: "MEMBER",
            aggregateId: state.member.id,
            eventType: "PREFLIGHT_REEVALUATED",
            actorType: "SYSTEM",
            actorName: "Claim Preflight",
            metadata: {
              trigger,
              passedCount: readiness.passedCount,
              totalChecks: readiness.totalChecks,
              readiness: readiness.percentage,
            },
          },
          this.context,
        ),
      ],
    };
  }

  private synchronizeClaimReadiness(state: AppState): AppState {
    const checks = runPreflight(state.member);
    if (state.claim.state !== "DRAFT" || hasBlockingChecks(checks)) {
      return state;
    }

    const result = transitionClaim(
      {
        claim: state.claim,
        nextState: "READY",
        checks,
        actorType: "SYSTEM",
        actorName: "Claim Preflight",
      },
      this.context,
    );
    return {
      ...state,
      claim: result.claim,
      auditEvents: [...state.auditEvents, result.auditEvent],
    };
  }
}
