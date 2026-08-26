import { MockClaimProcessorAdapter } from "@/adapters/mock-claim-processor-adapter";
import { MockEmployerAdapter } from "@/adapters/mock-employer-adapter";
import { MockTransferAdapter } from "@/adapters/mock-transfer-adapter";
import { createAuditEvent, type AuditContext } from "@/domain/audit";
import { transitionClaim } from "@/domain/claim-machine";
import { transitionIssue } from "@/domain/issue-machine";
import { hasBlockingChecks, runPreflight } from "@/domain/preflight";
import { calculateReadiness, type ReadinessResult } from "@/domain/readiness";
import type {
  AppState,
  ClaimState,
  Issue,
  PreflightCheck,
} from "@/domain/schemas";
import type { EpfoRepository } from "@/repositories/epfo-repository";

export type ApplicationSnapshot = AppState & {
  preflight: PreflightCheck[];
  readiness: ReadinessResult;
};

export type IssueAction = "START" | "SUBMIT" | "SIMULATE_RESOLUTION";

export class EpfoApplicationService {
  private readonly context: AuditContext;
  private readonly employerAdapter = new MockEmployerAdapter();
  private readonly transferAdapter = new MockTransferAdapter();
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
    };
  }

  completePreflight(): ApplicationSnapshot {
    const state = this.repository.getState();
    const checks = runPreflight(state.member);
    state.auditEvents.push(
      createAuditEvent(
        {
          aggregateType: "MEMBER",
          aggregateId: state.member.id,
          eventType: "PREFLIGHT_COMPLETED",
          actorType: "SYSTEM",
          actorName: "Claim Preflight",
          metadata: {
            readiness: calculateReadiness(checks).percentage,
            blockers: checks.filter((check) => check.status === "BLOCK").length,
          },
        },
        this.context,
      ),
    );
    this.repository.saveState(state);
    return this.getSnapshot();
  }

  actOnIssue(issueId: string, action: IssueAction): ApplicationSnapshot {
    let state = this.repository.getState();
    const issue = state.issues.find((candidate) => candidate.id === issueId);
    if (!issue) {
      throw new Error("The requested issue was not found.");
    }

    if (action === "SIMULATE_RESOLUTION") {
      state =
        issue.type === "MISSING_EXIT_DATE"
          ? this.employerAdapter.acceptExitDateCorrection(state, this.context)
          : this.transferAdapter.reconcileOldBalance(state, this.context);
      state = this.synchronizeClaimReadiness(state);
    } else {
      state = this.progressIssue(state, issue, action);
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
    const state = this.claimAdapter.advance(this.repository.getState(), nextState, this.context);
    this.repository.saveState(state);
    return this.getSnapshot();
  }

  reset(): ApplicationSnapshot {
    this.repository.reset();
    return this.getSnapshot();
  }

  private progressIssue(state: AppState, issue: Issue, action: IssueAction): AppState {
    const nextStatus = action === "START" ? "ACTION_REQUIRED" : "WAITING_EXTERNAL";
    const expectedAction = issue.status === "OPEN" ? "START" : "SUBMIT";
    if (action !== expectedAction) {
      throw new Error(
        issue.status === "RESOLVED"
          ? "This issue is already resolved."
          : "Complete the current issue action before moving ahead.",
      );
    }

    const result = transitionIssue(
      {
        issue,
        nextStatus,
        actorType: "CITIZEN",
        actorName: state.member.name,
        note:
          action === "START"
            ? "Aarav reviewed the issue and started the mock workflow."
            : "Aarav submitted the request to the responsible simulated party.",
      },
      this.context,
    );
    state.issues = state.issues.map((candidate) =>
      candidate.id === issue.id ? result.issue : candidate,
    );
    state.auditEvents.push(result.auditEvent);
    return state;
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
