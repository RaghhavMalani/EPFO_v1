import type { ActorType, AuditEvent } from "@/domain/schemas";

/**
 * The audit ledger, read as a story.
 *
 * Nothing here is new state — every line is an `AuditEvent` the engines already
 * wrote. What this adds is the two things a reader needs and a raw event list does
 * not give them: a readable name for each event, and the *consequence* of the ones
 * that changed something, so a judge can see readiness move 5/7 → 6/7 and see an
 * employer's payment land in a member's balance without decoding metadata.
 */

export type TraceActor = ActorType;

export type TraceEntry = {
  id: string;
  timestamp: string;
  actorType: TraceActor;
  actorName: string;
  eventType: string;
  label: string;
  /** The change this event caused, when it caused a measurable one. */
  consequence: string | null;
  /** Marks the events that cross a role boundary — the ones worth pointing at. */
  isCrossRole: boolean;
};

const EVENT_LABELS: Record<string, string> = {
  BLOCKER_CREATED: "Blocker detected",
  PREFLIGHT_COMPLETED: "Readiness checks run",
  PREFLIGHT_REEVALUATED: "Readiness re-evaluated",
  SELF_SERVICE_RESOLUTION_STARTED: "Member self-service started",
  MEMBER_RECORD_UPDATED: "Member record updated",
  EMPLOYER_REQUEST_CREATED: "Correction sent to employer",
  ECR_VALIDATED: "Payroll return validated",
  ECR_ROW_CORRECTED: "Payroll row corrected",
  ECR_CHALLAN_GENERATED: "Challan generated",
  ECR_PAYMENT_STARTED: "Payment started",
  ECR_PAYMENT_COMPLETED: "Payment completed",
  CONTRIBUTION_POSTED: "Contribution posted",
  PF_BALANCE_TRANSFERRED: "PF balance consolidated",
  ADVANCE_PREFLIGHT_COMPLETED: "Advance eligibility calculated",
  ADVANCE_SUBMITTED: "Advance submitted",
  TRANSFER_READY: "Transfer ready",
  NOMINATION_SAVED: "Nomination saved",
};

/**
 * Events where one role's action becomes another's outcome. These are the whole
 * argument for the product, so the trace calls them out rather than letting them
 * scroll past looking like everything else.
 */
const CROSS_ROLE_EVENTS = new Set([
  "ECR_PAYMENT_COMPLETED",
  "CONTRIBUTION_POSTED",
  "MEMBER_RECORD_UPDATED",
  "PF_BALANCE_TRANSFERRED",
]);

function readNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

function humanizeEventType(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType.toLowerCase().replace(/_/g, " ");
}

/**
 * Builds the trace, newest last.
 *
 * Readiness consequences are computed by diffing each preflight event against the
 * previous one, because a single event only knows where readiness landed — the
 * interesting part is where it came from.
 */
export function buildSystemTrace(events: AuditEvent[]): TraceEntry[] {
  let previousPassedCount: number | null = null;

  return events.map((event) => {
    let consequence: string | null = null;

    const passedCount = readNumber(event.metadata.passedCount);
    const totalChecks = readNumber(event.metadata.totalChecks);

    if (passedCount !== null && totalChecks !== null) {
      consequence =
        previousPassedCount !== null && previousPassedCount !== passedCount
          ? `readiness ${previousPassedCount}/${totalChecks} → ${passedCount}/${totalChecks}`
          : `readiness ${passedCount}/${totalChecks}`;
      previousPassedCount = passedCount;
    } else {
      // Several ECR events carry the same filing total, so the wording comes from what
      // the event actually did — a generated challan has not paid anything yet.
      const amountPaise = readNumber(event.metadata.amountPaise);
      const filingTotalPaise = readNumber(event.metadata.totalContributionPaise);
      if (amountPaise !== null) {
        consequence = `${formatRupees(amountPaise)} posted to the member`;
      } else if (filingTotalPaise !== null) {
        const amount = formatRupees(filingTotalPaise);
        consequence =
          event.eventType === "ECR_PAYMENT_COMPLETED"
            ? `${amount} paid`
            : event.eventType === "ECR_CHALLAN_GENERATED"
              ? `${amount} challan raised`
              : `${amount} in flight`;
      }
    }

    return {
      id: event.id,
      timestamp: event.timestamp,
      actorType: event.actorType,
      actorName: event.actorName,
      eventType: event.eventType,
      label: humanizeEventType(event.eventType),
      consequence,
      isCrossRole: CROSS_ROLE_EVENTS.has(event.eventType),
    };
  });
}
