import { describe, expect, it } from "vitest";
import { TOUR_STEPS, deriveTourProgress, type TourSignals } from "@/domain/judge-tour";
import { buildSystemTrace } from "@/domain/system-trace";
import type { AuditEvent } from "@/domain/schemas";

const freshScenario: TourSignals = {
  readinessPassedCount: 5,
  readinessTotalChecks: 7,
  claimState: "DRAFT",
  ecrPaid: false,
  marchEmployerContributionPaise: 0,
  pfBalancePaise: 32_040_000,
};

describe("guided walkthrough progress", () => {
  it("starts on the first beat for an untouched scenario", () => {
    const progress = deriveTourProgress(freshScenario, 0);
    expect(progress.currentIndex).toBe(0);
    expect(progress.phase).toBe("DETECT");
    expect(progress.isComplete).toBe(false);
  });

  it("advances as the judge clicks through beats that have no state signal", () => {
    expect(deriveTourProgress(freshScenario, 2).currentIndex).toBe(2);
    expect(deriveTourProgress(freshScenario, 2).steps[0].status).toBe("DONE");
    expect(deriveTourProgress(freshScenario, 2).steps[3].status).toBe("UPCOMING");
  });

  it("jumps forward when the scenario is further along than the clicks are", () => {
    // The judge paid the ECR without pressing Next; the rail must not still claim step 1.
    const progress = deriveTourProgress({ ...freshScenario, ecrPaid: true }, 0);
    expect(progress.currentIndex).toBe(2);
    expect(progress.steps[1].status).toBe("DONE");
  });

  it("never reports less progress than the scenario shows", () => {
    const settled: TourSignals = {
      ...freshScenario,
      ecrPaid: true,
      readinessPassedCount: 7,
      claimState: "CREDITED",
    };
    // Even asked to go back to the beginning, a finished scenario reads as finished.
    expect(deriveTourProgress(settled, 0).isComplete).toBe(true);
    expect(deriveTourProgress(settled, 0).steps.every((step) => step.status === "DONE")).toBe(true);
  });

  it("clamps an out-of-range acknowledgement instead of trusting the cookie", () => {
    expect(deriveTourProgress(freshScenario, -5).currentIndex).toBe(0);
    expect(deriveTourProgress(freshScenario, 999).currentIndex).toBe(TOUR_STEPS.length - 1);
  });

  it("runs the detect-resolve pattern twice across both roles", () => {
    const phases = TOUR_STEPS.map((step) => step.phase);
    expect(phases).toEqual(["DETECT", "RESOLVE", "VERIFY", "DETECT", "RESOLVE", "COMPLETE"]);
    expect(TOUR_STEPS.some((step) => step.role === "employer")).toBe(true);
  });
});

function auditEvent(overrides: Partial<AuditEvent>): AuditEvent {
  return {
    id: `audit-${Math.random()}`,
    aggregateType: "CLAIM",
    aggregateId: "claim-1",
    eventType: "PREFLIGHT_COMPLETED",
    timestamp: "2026-08-29T10:31:04.000Z",
    actorType: "SYSTEM",
    actorName: "Claim Preflight",
    metadata: {},
    ...overrides,
  };
}

describe("system trace", () => {
  it("reads a readiness change as a transition, not just a value", () => {
    const trace = buildSystemTrace([
      auditEvent({ metadata: { passedCount: 5, totalChecks: 7 } }),
      auditEvent({ eventType: "PREFLIGHT_REEVALUATED", metadata: { passedCount: 6, totalChecks: 7 } }),
    ]);
    expect(trace[0].consequence).toBe("readiness 5/7");
    expect(trace[1].consequence).toBe("readiness 5/7 → 6/7");
  });

  it("marks the events where one role's action becomes another's outcome", () => {
    const trace = buildSystemTrace([
      auditEvent({ eventType: "ECR_VALIDATED" }),
      auditEvent({
        eventType: "CONTRIBUTION_POSTED",
        actorType: "SYSTEM",
        metadata: { amountPaise: 672_000 },
      }),
    ]);
    expect(trace[0].isCrossRole).toBe(false);
    expect(trace[1].isCrossRole).toBe(true);
    expect(trace[1].consequence).toBe("₹6,720 posted to the member");
  });

  it("falls back to a readable label for an event type it has no name for", () => {
    const [entry] = buildSystemTrace([auditEvent({ eventType: "SOMETHING_NEW_HAPPENED" })]);
    expect(entry.label).toBe("something new happened");
  });
});

describe("trace consequence wording", () => {
  it("does not describe a generated challan as money already paid", () => {
    const trace = buildSystemTrace([
      auditEvent({ eventType: "ECR_CHALLAN_GENERATED", metadata: { totalContributionPaise: 38_273_000 } }),
      auditEvent({ eventType: "ECR_PAYMENT_STARTED", metadata: { totalContributionPaise: 38_273_000 } }),
      auditEvent({ eventType: "ECR_PAYMENT_COMPLETED", metadata: { totalContributionPaise: 38_273_000 } }),
    ]);
    expect(trace.map((entry) => entry.consequence)).toEqual([
      "₹3,82,730 challan raised",
      "₹3,82,730 in flight",
      "₹3,82,730 paid",
    ]);
  });
});
