import { createAuditEvent, type AuditContext } from "@/domain/audit";
import type {
  ActorType,
  AuditEvent,
  EmployerRequest,
  EmployerRequestStatus,
} from "@/domain/schemas";

const REQUEST_TRANSITIONS: Record<EmployerRequestStatus, EmployerRequestStatus[]> = {
  AWAITING_REVIEW: ["IN_REVIEW"],
  IN_REVIEW: ["APPROVED", "INFORMATION_REQUESTED", "REJECTED"],
  INFORMATION_REQUESTED: ["AWAITING_REVIEW"],
  APPROVED: [],
  REJECTED: [],
};

const EVENT_TYPES: Record<EmployerRequestStatus, string> = {
  AWAITING_REVIEW: "EMPLOYER_REQUEST_RESUBMITTED",
  IN_REVIEW: "EMPLOYER_REVIEW_STARTED",
  APPROVED: "EMPLOYER_REQUEST_APPROVED",
  INFORMATION_REQUESTED: "EMPLOYER_INFORMATION_REQUESTED",
  REJECTED: "EMPLOYER_REQUEST_REJECTED",
};

type RequestTransitionInput = {
  request: EmployerRequest;
  nextStatus: EmployerRequestStatus;
  actorType: ActorType;
  actorName: string;
  reason?: string;
};

export function transitionEmployerRequest(
  input: RequestTransitionInput,
  context: AuditContext,
): { request: EmployerRequest; auditEvent: AuditEvent } {
  if (!REQUEST_TRANSITIONS[input.request.status].includes(input.nextStatus)) {
    throw new Error(
      `Employer request cannot move from ${input.request.status} to ${input.nextStatus}.`,
    );
  }
  if (
    (input.nextStatus === "INFORMATION_REQUESTED" || input.nextStatus === "REJECTED") &&
    (!input.reason || input.reason.trim().length < 5)
  ) {
    throw new Error("A clear reason of at least 5 characters is required.");
  }

  const timestamp = context.now().toISOString();
  const reason = input.reason?.trim() ?? null;
  const request: EmployerRequest = {
    ...input.request,
    status: input.nextStatus,
    updatedAt: timestamp,
    reason,
    events: [
      ...input.request.events,
      {
        id: context.createId("employer-request-event"),
        timestamp,
        status: input.nextStatus,
        actorName: input.actorName,
        note:
          input.nextStatus === "IN_REVIEW"
            ? "Employer review started."
            : input.nextStatus === "APPROVED"
              ? "The proposed synthetic change was approved."
              : input.nextStatus === "AWAITING_REVIEW"
                ? "The member supplied synthetic context and resubmitted the request."
                : reason ?? "Request status changed.",
      },
    ],
  };

  return {
    request,
    auditEvent: createAuditEvent(
      {
        aggregateType: "EMPLOYER_REQUEST",
        aggregateId: input.request.id,
        eventType: EVENT_TYPES[input.nextStatus],
        actorType: input.actorType,
        actorName: input.actorName,
        metadata: {
          from: input.request.status,
          to: input.nextStatus,
          reason,
        },
      },
      context,
    ),
  };
}
