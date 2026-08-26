import { beforeEach, describe, expect, it } from "vitest";
import { EpfoApplicationService } from "@/application/epfo-service";
import { CLAIM_SEQUENCE, transitionClaim } from "@/domain/claim-machine";
import { runPreflight } from "@/domain/preflight";
import { calculateReadiness } from "@/domain/readiness";
import type { ClaimState } from "@/domain/schemas";
import { InMemoryEpfoRepository } from "@/repositories/in-memory-epfo-repository";

const fixedNow = () => new Date("2026-08-26T09:04:00.000Z");
let idSequence = 0;
const fixedId = (prefix: string) => `${prefix}-test-${++idSequence}`;

describe("EPFO One deterministic domain", () => {
  let repository: InMemoryEpfoRepository;
  let service: EpfoApplicationService;

  beforeEach(() => {
    idSequence = 0;
    repository = new InMemoryEpfoRepository();
    service = new EpfoApplicationService(repository, fixedNow, fixedId);
  });

  it("detects both initial blockers", () => {
    const blocked = runPreflight(repository.getState().member).filter(
      (check) => check.status === "BLOCK",
    );
    expect(blocked.map((check) => check.id)).toEqual([
      "PREVIOUS_EMPLOYMENT_EXIT_RECORDED",
      "OLD_BALANCE_TRANSFERRED",
    ]);
  });

  it("calculates initial readiness as 72", () => {
    const checks = runPreflight(repository.getState().member);
    expect(calculateReadiness(checks).percentage).toBe(72);
  });

  it("updates the employment record when the exit date is resolved", () => {
    service.actOnIssue("issue-exit-date", "SIMULATE_RESOLUTION");
    const record = repository
      .getState()
      .member.employments.find((employment) => employment.id === "employment-demo-systems");
    expect(record?.exitStatus).toBe("VERIFIED");
    expect(record?.pfRecordExitDate).toBe("2023-08-15");
  });

  it("raises readiness to 86 after the exit date fix", () => {
    service.actOnIssue("issue-exit-date", "SIMULATE_RESOLUTION");
    expect(service.getSnapshot().readiness.percentage).toBe(86);
  });

  it("updates the old employment balance domain state", () => {
    service.actOnIssue("issue-old-balance", "SIMULATE_RESOLUTION");
    const record = repository
      .getState()
      .member.employments.find((employment) => employment.id === "employment-demo-systems");
    expect(record?.transferStatus).toBe("TRANSFERRED");
    expect(record?.pfBalancePaise).toBe(0);
    expect(record?.transferredAmountPaise).toBe(4_260_000);
  });

  it("raises readiness to 100 after both issues resolve", () => {
    service.actOnIssue("issue-exit-date", "SIMULATE_RESOLUTION");
    service.actOnIssue("issue-old-balance", "SIMULATE_RESOLUTION");
    expect(service.getSnapshot().readiness.percentage).toBe(100);
  });

  it("does not allow a claim to become READY while blockers exist", () => {
    const state = repository.getState();
    expect(() =>
      transitionClaim(
        {
          claim: state.claim,
          nextState: "READY",
          checks: runPreflight(state.member),
          actorType: "SYSTEM",
          actorName: "Claim Preflight",
        },
        { now: fixedNow, createId: fixedId },
      ),
    ).toThrow("preflight blockers remain");
  });

  it("allows a claim to become READY after every blocker resolves", () => {
    service.actOnIssue("issue-exit-date", "SIMULATE_RESOLUTION");
    const snapshot = service.actOnIssue("issue-old-balance", "SIMULATE_RESOLUTION");
    expect(snapshot.claim.state).toBe("READY");
  });

  it("does not allow claim states to be skipped", () => {
    service.actOnIssue("issue-exit-date", "SIMULATE_RESOLUTION");
    service.actOnIssue("issue-old-balance", "SIMULATE_RESOLUTION");
    service.submitClaim(true);
    expect(() => service.advanceClaim("APPROVED")).toThrow(
      "Claim cannot move from SUBMITTED to APPROVED",
    );
  });

  it("creates an AuditEvent for every claim state transition", () => {
    service.actOnIssue("issue-exit-date", "SIMULATE_RESOLUTION");
    service.actOnIssue("issue-old-balance", "SIMULATE_RESOLUTION");
    service.submitClaim(true);

    const laterStates: ClaimState[] = CLAIM_SEQUENCE.slice(3);
    for (const state of laterStates) {
      service.advanceClaim(state);
    }

    const claimEvents = service
      .getSnapshot()
      .auditEvents.filter((event) => event.aggregateId === "claim-demo-001");
    expect(claimEvents).toHaveLength(8);
    expect(claimEvents.map((event) => event.eventType)).toEqual([
      "CLAIM_READY",
      "CLAIM_SUBMITTED",
      "CLAIM_ELIGIBILITY_VERIFIED",
      "CLAIM_RECORDS_VERIFIED",
      "CLAIM_APPROVED",
      "PAYMENT_INSTRUCTION_CREATED",
      "PAYMENT_SENT_TO_BANK",
      "PAYMENT_CREDITED",
    ]);
  });
});
