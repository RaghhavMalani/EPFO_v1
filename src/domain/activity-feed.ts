import type { AppState, AuditEvent, IssueType } from "@/domain/schemas";

export type ActivityTone = "attention" | "progress" | "complete";

export type ActivityEntry = {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  tone: ActivityTone;
  href: string | null;
};

/** The short subject each issue type refers to, used to describe its events. */
const ISSUE_SUBJECT: Record<IssueType, string> = {
  MISSING_EXIT_DATE: "Date of Exit",
  LEGACY_EMPLOYMENT_EXCEPTION: "Legacy employment record",
  BANK_NOT_READY: "Bank account",
  PROFILE_CORRECTION: "Profile details",
};

function monthLabel(month: string) {
  const [year, index] = month.split("-");
  const name = new Intl.DateTimeFormat("en-IN", { month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(Number(year), Number(index) - 1, 1)));
  return `${name} ${year}`;
}

/**
 * Turns a raw audit event into something a citizen can read.
 *
 * Two events of the same type on different aggregates must never produce the same
 * sentence, so each description is resolved against the aggregate it points at.
 * Returns null for events that carry no meaning for the member.
 */
function describe(event: AuditEvent, state: AppState): ActivityEntry | null {
  const base = { id: event.id, timestamp: event.timestamp };

  if (event.aggregateType === "ISSUE") {
    const issue = state.issues.find((item) => item.id === event.aggregateId);
    if (!issue) return null;
    const subject = ISSUE_SUBJECT[issue.type];
    const href = `/issues/${issue.id}`;
    if (event.eventType === "BLOCKER_CREATED") {
      return {
        ...base,
        title: `${subject} issue detected`,
        detail: `Found while checking Form 19 readiness. ${issue.responsibleParty} can resolve it.`,
        tone: "attention",
        href,
      };
    }
    if (event.eventType === "ISSUE_RESOLVED") {
      return { ...base, title: `${subject} issue resolved`, detail: issue.title, tone: "complete", href };
    }
    return { ...base, title: `${subject} updated`, detail: issue.title, tone: "progress", href };
  }

  if (event.aggregateType === "CONTRIBUTION") {
    const contribution = state.experience.contributions.find((item) => item.id === event.aggregateId);
    if (!contribution) return null;
    return {
      ...base,
      title: `${monthLabel(contribution.month)} contribution posted`,
      detail: `${contribution.employerName} completed the monthly filing.`,
      tone: "complete",
      href: `/passbook?month=${contribution.month}`,
    };
  }

  if (event.aggregateType === "EMPLOYER_REQUEST") {
    const request = state.employerRequests.find((item) => item.id === event.aggregateId);
    if (!request) return null;
    const resolved = event.eventType === "REQUEST_APPROVED";
    return {
      ...base,
      title: resolved ? "Employer approved a record correction" : "Employer review requested",
      detail: `${request.title} at ${event.actorName}.`,
      tone: resolved ? "complete" : "progress",
      href: null,
    };
  }

  if (event.aggregateType === "EMPLOYMENT_RECORD") {
    return {
      ...base,
      title: event.eventType === "PF_BALANCE_TRANSFERRED" ? "PF balance consolidated" : "Employment record updated",
      detail: `Recorded by ${event.actorName}.`,
      tone: "complete",
      href: "/member",
    };
  }

  if (event.aggregateType === "CLAIM" || event.aggregateType === "PAYMENT") {
    const credited = event.eventType === "CREDITED";
    return {
      ...base,
      title: credited ? "Settlement credited" : "Claim progressed",
      detail: `${event.actorName} moved the final settlement forward.`,
      tone: credited ? "complete" : "progress",
      href: `/claims/${state.claim.id}`,
    };
  }

  return null;
}

/** The member-facing activity feed, newest first. */
export function buildMemberActivity(state: AppState, limit = 4): ActivityEntry[] {
  const entries: ActivityEntry[] = [];
  for (const event of [...state.auditEvents].reverse()) {
    const entry = describe(event, state);
    if (entry) entries.push(entry);
    if (entries.length === limit) break;
  }
  return entries;
}
