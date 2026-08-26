import { createAuditEvent, type AuditContext } from "@/domain/audit";
import { transitionIssue } from "@/domain/issue-machine";
import type { AppState, Issue } from "@/domain/schemas";

function moveToWaiting(issue: Issue, context: AuditContext) {
  const auditEvents = [];
  let current = issue;

  if (current.status === "OPEN") {
    const result = transitionIssue(
      {
        issue: current,
        nextStatus: "ACTION_REQUIRED",
        actorType: "CITIZEN",
        actorName: "Aarav Sharma",
        note: "Synthetic transfer reconciliation started.",
      },
      context,
    );
    current = result.issue;
    auditEvents.push(result.auditEvent);
  }
  if (current.status === "ACTION_REQUIRED") {
    const result = transitionIssue(
      {
        issue: current,
        nextStatus: "WAITING_EXTERNAL",
        actorType: "CITIZEN",
        actorName: "Aarav Sharma",
        note: "Reconciliation request sent to simulated processing.",
      },
      context,
    );
    current = result.issue;
    auditEvents.push(result.auditEvent);
  }
  if (current.status === "ESCALATED") {
    const result = transitionIssue(
      {
        issue: current,
        nextStatus: "WAITING_EXTERNAL",
        actorType: "PROCESSOR",
        actorName: "EPFO Processing · Simulation",
        note: "Escalated reconciliation returned to processing.",
      },
      context,
    );
    current = result.issue;
    auditEvents.push(result.auditEvent);
  }

  return { issue: current, auditEvents };
}

export class MockTransferAdapter {
  reconcileOldBalance(state: AppState, context: AuditContext): AppState {
    const issueIndex = state.issues.findIndex(
      (issue) => issue.type === "OLD_BALANCE_NOT_TRANSFERRED",
    );
    if (issueIndex < 0) {
      throw new Error("The old balance issue was not found.");
    }
    if (state.issues[issueIndex].status === "RESOLVED") {
      throw new Error("The old balance issue is already resolved.");
    }

    const waiting = moveToWaiting(state.issues[issueIndex], context);
    const employmentIndex = state.member.employments.findIndex(
      (record) => record.id === "employment-demo-systems",
    );
    if (employmentIndex < 0) {
      throw new Error("The previous employment record was not found.");
    }

    const employment = state.member.employments[employmentIndex];
    const reconciledAmountPaise = employment.pfBalancePaise;
    const updatedEmployment = {
      ...employment,
      pfBalancePaise: 0,
      transferredAmountPaise: employment.transferredAmountPaise + reconciledAmountPaise,
      transferStatus: "TRANSFERRED" as const,
    };
    const resolved = transitionIssue(
      {
        issue: waiting.issue,
        nextStatus: "RESOLVED",
        actorType: "PROCESSOR",
        actorName: "EPFO Processing · Simulation",
        note: "₹42,600 was reconciled into the aligned synthetic PF record.",
      },
      context,
    );

    const employments = [...state.member.employments];
    employments[employmentIndex] = updatedEmployment;
    const issues = [...state.issues];
    issues[issueIndex] = resolved.issue;

    return {
      ...state,
      member: { ...state.member, employments },
      issues,
      auditEvents: [
        ...state.auditEvents,
        ...waiting.auditEvents,
        createAuditEvent(
          {
            aggregateType: "EMPLOYMENT_RECORD",
            aggregateId: employment.id,
            eventType: "EMPLOYMENT_RECORD_UPDATED",
            actorType: "PROCESSOR",
            actorName: "EPFO Processing · Simulation",
            metadata: {
              field: "transferStatus",
              value: "TRANSFERRED",
              reconciledAmountPaise,
            },
          },
          context,
        ),
        resolved.auditEvent,
      ],
    };
  }
}
