import { createAuditEvent, type AuditContext } from "@/domain/audit";
import type { ActorType, AuditEvent, Issue, IssueStatus } from "@/domain/schemas";

const ISSUE_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  OPEN: ["ACTION_REQUIRED"],
  ACTION_REQUIRED: ["WAITING_EXTERNAL"],
  WAITING_EXTERNAL: ["RESOLVED", "ESCALATED"],
  RESOLVED: [],
  ESCALATED: ["WAITING_EXTERNAL"],
};

type IssueTransitionInput = {
  issue: Issue;
  nextStatus: IssueStatus;
  actorType: ActorType;
  actorName: string;
  note: string;
};

export function transitionIssue(
  input: IssueTransitionInput,
  context: AuditContext,
): { issue: Issue; auditEvent: AuditEvent } {
  if (!ISSUE_TRANSITIONS[input.issue.status].includes(input.nextStatus)) {
    throw new Error(`Issue cannot move from ${input.issue.status} to ${input.nextStatus}.`);
  }

  const timestamp = context.now().toISOString();
  const issue: Issue = {
    ...input.issue,
    status: input.nextStatus,
    updatedAt: timestamp,
    events: [
      ...input.issue.events,
      {
        id: context.createId("issue-event"),
        timestamp,
        status: input.nextStatus,
        actorName: input.actorName,
        note: input.note,
      },
    ],
  };

  return {
    issue,
    auditEvent: createAuditEvent(
      {
        aggregateType: "ISSUE",
        aggregateId: input.issue.id,
        eventType: "ISSUE_STATUS_CHANGED",
        actorType: input.actorType,
        actorName: input.actorName,
        metadata: {
          from: input.issue.status,
          to: input.nextStatus,
          issueType: input.issue.type,
        },
      },
      context,
    ),
  };
}
