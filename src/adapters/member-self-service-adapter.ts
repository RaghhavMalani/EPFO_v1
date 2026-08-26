import { createAuditEvent, type AuditContext } from "@/domain/audit";
import { transitionIssue } from "@/domain/issue-machine";
import type { AppState } from "@/domain/schemas";

export class MemberSelfServiceAdapter {
  startMarkExit(state: AppState, issueId: string, context: AuditContext): AppState {
    const issue = state.issues.find((candidate) => candidate.id === issueId);
    if (!issue || issue.type !== "MISSING_EXIT_DATE") {
      throw new Error("The Mark Exit issue was not found.");
    }
    const result = transitionIssue(
      {
        issue,
        nextStatus: "ACTION_REQUIRED",
        actorType: "CITIZEN",
        actorName: state.member.name,
        note: "Member self-service Mark Exit started.",
      },
      context,
    );

    return {
      ...state,
      issues: state.issues.map((candidate) =>
        candidate.id === issueId ? result.issue : candidate,
      ),
      auditEvents: [
        ...state.auditEvents,
        result.auditEvent,
        createAuditEvent(
          {
            aggregateType: "ISSUE",
            aggregateId: issueId,
            eventType: "SELF_SERVICE_RESOLUTION_STARTED",
            actorType: "CITIZEN",
            actorName: state.member.name,
            metadata: { workflow: "MARK_EXIT" },
          },
          context,
        ),
      ],
    };
  }

  completeMarkExit(state: AppState, issueId: string, context: AuditContext): AppState {
    const issueIndex = state.issues.findIndex((candidate) => candidate.id === issueId);
    if (issueIndex < 0 || state.issues[issueIndex].type !== "MISSING_EXIT_DATE") {
      throw new Error("The Mark Exit issue was not found.");
    }
    const issue = state.issues[issueIndex];
    if (issue.status !== "ACTION_REQUIRED") {
      throw new Error("Start the Mark Exit workflow before confirming the date.");
    }
    const employmentIndex = state.member.employments.findIndex(
      (record) => record.id === issue.relatedEmploymentId,
    );
    if (employmentIndex < 0) {
      throw new Error("The related employment record was not found.");
    }
    const employment = state.member.employments[employmentIndex];
    if (!employment.employmentEnd) {
      throw new Error("The synthetic employment end date is unavailable.");
    }

    const resolved = transitionIssue(
      {
        issue,
        nextStatus: "RESOLVED",
        actorType: "CITIZEN",
        actorName: state.member.name,
        note: "Member confirmed the synthetic Date of Exit.",
      },
      context,
    );
    const employments = [...state.member.employments];
    employments[employmentIndex] = {
      ...employment,
      exitStatus: "VERIFIED",
      pfRecordExitDate: employment.employmentEnd,
    };
    const issues = [...state.issues];
    issues[issueIndex] = resolved.issue;

    return {
      ...state,
      member: { ...state.member, employments },
      issues,
      auditEvents: [
        ...state.auditEvents,
        createAuditEvent(
          {
            aggregateType: "EMPLOYMENT_RECORD",
            aggregateId: employment.id,
            eventType: "MEMBER_RECORD_UPDATED",
            actorType: "CITIZEN",
            actorName: state.member.name,
            metadata: {
              field: "pfRecordExitDate",
              value: employment.employmentEnd,
              route: "SELF_SERVICE",
            },
          },
          context,
        ),
        resolved.auditEvent,
      ],
    };
  }
}
