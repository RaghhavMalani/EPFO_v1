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
        note: "Correction workflow started.",
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
        note: "Correction request sent to the simulated employer.",
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
        note: "Escalated correction returned to employer review.",
      },
      context,
    );
    current = result.issue;
    auditEvents.push(result.auditEvent);
  }

  return { issue: current, auditEvents };
}

export class MockEmployerAdapter {
  acceptExitDateCorrection(state: AppState, context: AuditContext): AppState {
    const issueIndex = state.issues.findIndex((issue) => issue.type === "MISSING_EXIT_DATE");
    if (issueIndex < 0) {
      throw new Error("The missing Date of Exit issue was not found.");
    }
    if (state.issues[issueIndex].status === "RESOLVED") {
      throw new Error("The Date of Exit issue is already resolved.");
    }

    const waiting = moveToWaiting(state.issues[issueIndex], context);
    const employmentIndex = state.member.employments.findIndex(
      (record) => record.id === "employment-demo-systems",
    );
    if (employmentIndex < 0) {
      throw new Error("The previous employment record was not found.");
    }

    const employment = state.member.employments[employmentIndex];
    const updatedEmployment = {
      ...employment,
      exitStatus: "VERIFIED" as const,
      pfRecordExitDate: employment.employmentEnd,
    };
    const resolved = transitionIssue(
      {
        issue: waiting.issue,
        nextStatus: "RESOLVED",
        actorType: "EMPLOYER",
        actorName: "Demo Systems Pvt Ltd · Simulation",
        note: "The simulated employer accepted and recorded the Date of Exit.",
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
            actorType: "EMPLOYER",
            actorName: "Demo Systems Pvt Ltd · Simulation",
            metadata: {
              field: "pfRecordExitDate",
              value: employment.employmentEnd,
            },
          },
          context,
        ),
        resolved.auditEvent,
      ],
    };
  }
}
