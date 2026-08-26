import { createAuditEvent, type AuditContext } from "@/domain/audit";
import { transitionEmployerRequest } from "@/domain/employer-request-machine";
import { transitionIssue } from "@/domain/issue-machine";
import type {
  AppState,
  EmployerRequest,
  EmployerRequestStatus,
  Issue,
} from "@/domain/schemas";

export type EmployerDecision =
  | "START_REVIEW"
  | "APPROVE"
  | "REQUEST_INFORMATION"
  | "REJECT";

const TARGET_BY_DECISION: Record<EmployerDecision, EmployerRequestStatus> = {
  START_REVIEW: "IN_REVIEW",
  APPROVE: "APPROVED",
  REQUEST_INFORMATION: "INFORMATION_REQUESTED",
  REJECT: "REJECTED",
};

function progressIssueToWaiting(issue: Issue, context: AuditContext) {
  let current = issue;
  const auditEvents = [];
  if (current.status === "OPEN") {
    const actionRequired = transitionIssue(
      {
        issue: current,
        nextStatus: "ACTION_REQUIRED",
        actorType: "CITIZEN",
        actorName: "Aarav Sharma",
        note: "Member reviewed the employer-owned exception.",
      },
      context,
    );
    current = actionRequired.issue;
    auditEvents.push(actionRequired.auditEvent);
  }
  if (current.status === "ACTION_REQUIRED") {
    const waiting = transitionIssue(
      {
        issue: current,
        nextStatus: "WAITING_EXTERNAL",
        actorType: "CITIZEN",
        actorName: "Aarav Sharma",
        note: "Employer review request created.",
      },
      context,
    );
    current = waiting.issue;
    auditEvents.push(waiting.auditEvent);
  }
  return { issue: current, auditEvents };
}

export class EmployerWorkflowAdapter {
  createRequest(state: AppState, issueId: string, context: AuditContext): AppState {
    const issueIndex = state.issues.findIndex((issue) => issue.id === issueId);
    if (issueIndex < 0 || state.issues[issueIndex].type !== "LEGACY_EMPLOYMENT_EXCEPTION") {
      throw new Error("The employer-owned exception was not found.");
    }
    if (state.employerRequests.some((request) => request.issueId === issueId)) {
      throw new Error("An employer request already exists for this issue.");
    }
    const issue = state.issues[issueIndex];
    const employment = state.member.employments.find(
      (record) => record.id === issue.relatedEmploymentId,
    );
    if (!employment) {
      throw new Error("The related employment record was not found.");
    }

    const progressed = progressIssueToWaiting(issue, context);
    const timestamp = context.now().toISOString();
    const request: EmployerRequest = {
      id: context.createId("employer-request"),
      issueId,
      memberId: state.member.id,
      memberName: state.member.name,
      requestType: "LEGACY_RECORD_CORRECTION",
      title: "Legacy employment detail correction",
      currentRecord: {
        Employer: employment.employerName,
        "Date of Exit": employment.pfRecordExitDate ?? "Not recorded",
        "Service-end reason": employment.serviceEndReason ?? "Not recorded",
      },
      proposedRecord: {
        Employer: employment.employerName,
        "Date of Exit": employment.employmentEnd ?? "Not available",
        "Service-end reason": "Resignation",
      },
      whyItMatters: issue.whyItMatters,
      relatedJourney: "Final PF settlement",
      submittedAt: timestamp,
      updatedAt: timestamp,
      status: "AWAITING_REVIEW",
      supportingContext: [
        "Synthetic employment period: 01 July 2022 to 10 June 2026",
        "Member-completed synthetic Date of Exit record",
        "No real employer document or credential is used",
      ],
      reason: null,
      events: [
        {
          id: context.createId("employer-request-event"),
          timestamp,
          status: "AWAITING_REVIEW",
          actorName: state.member.name,
          note: "Synthetic employer review request submitted.",
        },
      ],
    };
    const issues = [...state.issues];
    issues[issueIndex] = progressed.issue;

    return {
      ...state,
      issues,
      employerRequests: [...state.employerRequests, request],
      auditEvents: [
        ...state.auditEvents,
        ...progressed.auditEvents,
        createAuditEvent(
          {
            aggregateType: "EMPLOYER_REQUEST",
            aggregateId: request.id,
            eventType: "EMPLOYER_REQUEST_CREATED",
            actorType: "CITIZEN",
            actorName: state.member.name,
            metadata: { issueId, relatedJourney: request.relatedJourney },
          },
          context,
        ),
      ],
    };
  }

  decide(
    state: AppState,
    requestId: string,
    decision: EmployerDecision,
    reason: string | undefined,
    context: AuditContext,
  ): AppState {
    const requestIndex = state.employerRequests.findIndex((request) => request.id === requestId);
    if (requestIndex < 0) {
      throw new Error("The employer request was not found.");
    }
    const current = state.employerRequests[requestIndex];
    const result = transitionEmployerRequest(
      {
        request: current,
        nextStatus: TARGET_BY_DECISION[decision],
        actorType: "EMPLOYER",
        actorName: "Demo Employer Reviewer",
        reason,
      },
      context,
    );
    const requests = [...state.employerRequests];
    requests[requestIndex] = result.request;
    const nextState: AppState = {
      ...state,
      employerRequests: requests,
      auditEvents: [...state.auditEvents, result.auditEvent],
    };

    if (!current.issueId || decision === "START_REVIEW") {
      return nextState;
    }
    const issueIndex = nextState.issues.findIndex((issue) => issue.id === current.issueId);
    if (issueIndex < 0) {
      throw new Error("The related member issue was not found.");
    }
    const issue = nextState.issues[issueIndex];

    if (decision === "REQUEST_INFORMATION") {
      const changed = transitionIssue(
        {
          issue,
          nextStatus: "ACTION_REQUIRED",
          actorType: "EMPLOYER",
          actorName: "Demo Employer Reviewer",
          note: `Information requested: ${reason}`,
        },
        context,
      );
      nextState.issues[issueIndex] = changed.issue;
      nextState.auditEvents.push(changed.auditEvent);
      return nextState;
    }
    if (decision === "REJECT") {
      const changed = transitionIssue(
        {
          issue,
          nextStatus: "ESCALATED",
          actorType: "EMPLOYER",
          actorName: "Demo Employer Reviewer",
          note: `Request rejected: ${reason}`,
        },
        context,
      );
      nextState.issues[issueIndex] = changed.issue;
      nextState.auditEvents.push(changed.auditEvent);
      return nextState;
    }
    if (decision !== "APPROVE") {
      return nextState;
    }

    const employmentIndex = nextState.member.employments.findIndex(
      (record) => record.id === issue.relatedEmploymentId,
    );
    if (employmentIndex < 0) {
      throw new Error("The related employment record was not found.");
    }
    const employment = nextState.member.employments[employmentIndex];
    nextState.member.employments[employmentIndex] = {
      ...employment,
      legacyRecordStatus: "ALIGNED",
      serviceEndReason: "RESIGNATION",
    };
    const resolved = transitionIssue(
      {
        issue,
        nextStatus: "RESOLVED",
        actorType: "EMPLOYER",
        actorName: "Demo Employer Reviewer",
        note: "Employer approved the proposed legacy record correction.",
      },
      context,
    );
    nextState.issues[issueIndex] = resolved.issue;
    nextState.auditEvents.push(
      createAuditEvent(
        {
          aggregateType: "EMPLOYMENT_RECORD",
          aggregateId: employment.id,
          eventType: "MEMBER_RECORD_UPDATED",
          actorType: "EMPLOYER",
          actorName: "Demo Employer Reviewer",
          metadata: {
            field: "serviceEndReason",
            value: "RESIGNATION",
            route: "EMPLOYER_ACTION",
          },
        },
        context,
      ),
      resolved.auditEvent,
    );
    return nextState;
  }

  resubmit(state: AppState, issueId: string, context: AuditContext): AppState {
    const requestIndex = state.employerRequests.findIndex(
      (request) => request.issueId === issueId && request.status === "INFORMATION_REQUESTED",
    );
    if (requestIndex < 0) {
      throw new Error("No information request is available to resubmit.");
    }
    const requestResult = transitionEmployerRequest(
      {
        request: state.employerRequests[requestIndex],
        nextStatus: "AWAITING_REVIEW",
        actorType: "CITIZEN",
        actorName: state.member.name,
      },
      context,
    );
    const issueIndex = state.issues.findIndex((issue) => issue.id === issueId);
    if (issueIndex < 0) {
      throw new Error("The related issue was not found.");
    }
    const issueResult = transitionIssue(
      {
        issue: state.issues[issueIndex],
        nextStatus: "WAITING_EXTERNAL",
        actorType: "CITIZEN",
        actorName: state.member.name,
        note: "Synthetic supporting context supplied and request resubmitted.",
      },
      context,
    );
    const requests = [...state.employerRequests];
    requests[requestIndex] = requestResult.request;
    const issues = [...state.issues];
    issues[issueIndex] = issueResult.issue;
    return {
      ...state,
      employerRequests: requests,
      issues,
      auditEvents: [
        ...state.auditEvents,
        requestResult.auditEvent,
        issueResult.auditEvent,
      ],
    };
  }
}
