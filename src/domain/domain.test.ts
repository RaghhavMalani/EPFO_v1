import { beforeEach, describe, expect, it } from "vitest";
import { EpfoApplicationService } from "@/application/epfo-service";
import { CLAIM_SEQUENCE, transitionClaim } from "@/domain/claim-machine";
import { transitionEmployerRequest } from "@/domain/employer-request-machine";
import { runPreflight } from "@/domain/preflight";
import { calculateReadiness } from "@/domain/readiness";
import { routeResolution } from "@/domain/resolution-router";
import type { ClaimState, Issue } from "@/domain/schemas";
import { InMemoryEpfoRepository } from "@/repositories/in-memory-epfo-repository";

const fixedNow = () => new Date("2026-08-26T09:04:00.000Z");
let idSequence = 0;
const fixedId = (prefix: string) => `${prefix}-test-${++idSequence}`;
const context = { now: fixedNow, createId: fixedId };

describe("EPFO One deterministic domain", () => {
  let repository: InMemoryEpfoRepository;
  let service: EpfoApplicationService;

  beforeEach(() => {
    idSequence = 0;
    repository = new InMemoryEpfoRepository();
    service = new EpfoApplicationService(repository, fixedNow, fixedId);
  });

  function resolveReadinessBlockers() {
    service.startMarkExit("issue-exit-date");
    service.completeMarkExit("issue-exit-date");
    service.createEmployerRequest("issue-legacy-record");
    const requestId = service.getSnapshot().employerRequests.find(
      (request) => request.issueId === "issue-legacy-record",
    )!.id;
    service.actOnEmployerRequest(requestId, "START_REVIEW");
    service.actOnEmployerRequest(requestId, "APPROVE");
    return requestId;
  }

  it("starts with exactly seven checks, five passes, and 71 percent", () => {
    const snapshot = service.getSnapshot();
    expect(snapshot.preflight).toHaveLength(7);
    expect(snapshot.readiness).toMatchObject({
      passedCount: 5,
      totalChecks: 7,
      percentage: 71,
      attentionCount: 2,
      isReady: false,
    });
    expect(snapshot.preflight.filter((check) => check.status === "BLOCK").map((check) => check.id)).toEqual([
      "EXIT_DATE_RECORDED",
      "LEGACY_RECORD_ALIGNED",
    ]);
  });

  it("routes eligible Mark Exit to member self-service", () => {
    const state = repository.getState();
    expect(routeResolution(state.issues[0], state.member).resolutionType).toBe("SELF_SERVICE");
  });

  it("never routes bank seeding through employer approval", () => {
    const state = repository.getState();
    const bankIssue: Issue = {
      ...state.issues[0],
      id: "issue-bank",
      type: "BANK_NOT_READY",
      title: "Bank details need verification",
    };
    const route = routeResolution(bankIssue, state.member);
    // Assert the routing decision itself rather than its wording: bank seeding must
    // stay on the self-service path and must never hand ownership to the employer.
    expect(route.resolutionType).toBe("SELF_SERVICE");
    expect(route.nextState).toBe("ACTION_REQUIRED");
    expect(route.responsibleParty).not.toContain(state.employer.name);
  });

  it("routes an Aadhaar-validated profile correction to self-service", () => {
    const state = repository.getState();
    const profileIssue: Issue = {
      ...state.issues[0],
      id: "issue-profile",
      type: "PROFILE_CORRECTION",
      title: "Profile value needs correction",
    };
    expect(routeResolution(profileIssue, state.member).resolutionType).toBe("SELF_SERVICE");
  });

  it("Mark Exit updates the employment record and moves readiness to 6 of 7", () => {
    service.startMarkExit("issue-exit-date");
    const snapshot = service.completeMarkExit("issue-exit-date");
    const record = snapshot.member.employments.find(
      (employment) => employment.id === "employment-demo-systems",
    );
    expect(record?.exitStatus).toBe("VERIFIED");
    expect(record?.pfRecordExitDate).toBe("2026-06-10");
    expect(snapshot.readiness).toMatchObject({ passedCount: 6, percentage: 86 });
    expect(snapshot.auditEvents.some((event) => event.eventType === "PREFLIGHT_REEVALUATED")).toBe(true);
  });

  it("creates one shared employer request and places the member issue in external wait", () => {
    service.createEmployerRequest("issue-legacy-record");
    const snapshot = service.getSnapshot();
    const request = snapshot.employerRequests.find((item) => item.issueId === "issue-legacy-record");
    expect(request).toMatchObject({
      memberName: "Aarav Sharma",
      status: "AWAITING_REVIEW",
      relatedJourney: "Final PF settlement",
    });
    expect(snapshot.issues.find((issue) => issue.id === "issue-legacy-record")?.status).toBe("WAITING_EXTERNAL");
  });

  it("requires a clear reason for employer information requests and rejections", () => {
    service.createEmployerRequest("issue-legacy-record");
    const requestId = service.getSnapshot().employerRequests.find(
      (request) => request.issueId === "issue-legacy-record",
    )!.id;
    service.actOnEmployerRequest(requestId, "START_REVIEW");
    const request = service.getSnapshot().employerRequests.find((item) => item.id === requestId)!;
    expect(() => transitionEmployerRequest({ request, nextStatus: "INFORMATION_REQUESTED", actorType: "EMPLOYER", actorName: "Reviewer" }, context)).toThrow("clear reason");
    expect(() => transitionEmployerRequest({ request, nextStatus: "REJECTED", actorType: "EMPLOYER", actorName: "Reviewer", reason: "No" }, context)).toThrow("clear reason");
  });

  it("surfaces employer reasons to the shared member issue and supports resubmission", () => {
    service.createEmployerRequest("issue-legacy-record");
    const requestId = service.getSnapshot().employerRequests.find((request) => request.issueId === "issue-legacy-record")!.id;
    service.actOnEmployerRequest(requestId, "START_REVIEW");
    let snapshot = service.actOnEmployerRequest(requestId, "REQUEST_INFORMATION", "Please confirm the service-end context.");
    expect(snapshot.employerRequests.find((request) => request.id === requestId)?.reason).toBe("Please confirm the service-end context.");
    expect(snapshot.issues.find((issue) => issue.id === "issue-legacy-record")?.events.at(-1)?.note).toContain("Please confirm");
    snapshot = service.resubmitEmployerRequest("issue-legacy-record");
    expect(snapshot.employerRequests.find((request) => request.id === requestId)?.status).toBe("AWAITING_REVIEW");
  });

  it("employer approval updates the shared record, reaches 7 of 7, and makes the claim ready", () => {
    const requestId = resolveReadinessBlockers();
    const snapshot = service.getSnapshot();
    expect(snapshot.employerRequests.find((request) => request.id === requestId)?.status).toBe("APPROVED");
    expect(snapshot.member.employments.at(-1)).toMatchObject({ legacyRecordStatus: "ALIGNED", serviceEndReason: "RESIGNATION" });
    expect(snapshot.readiness).toMatchObject({ passedCount: 7, percentage: 100, isReady: true });
    expect(snapshot.claim.state).toBe("READY");
  });

  it("does not allow a claim to become READY while blockers remain", () => {
    const state = repository.getState();
    expect(() => transitionClaim({ claim: state.claim, nextState: "READY", checks: runPreflight(state.member), actorType: "SYSTEM", actorName: "Claim Preflight" }, context)).toThrow("preflight blockers remain");
  });

  it("requires explicit confirmation before claim submission", () => {
    resolveReadinessBlockers();
    expect(() => service.submitClaim(false)).toThrow("explicit user confirmation");
  });

  it("does not allow claim states to be skipped", () => {
    resolveReadinessBlockers();
    service.submitClaim(true);
    expect(() => service.advanceClaim("APPROVED")).toThrow("Claim cannot move from SUBMITTED to APPROVED");
  });

  it("creates an audit event for every claim and payment transition", () => {
    resolveReadinessBlockers();
    service.submitClaim(true);
    const laterStates: ClaimState[] = CLAIM_SEQUENCE.slice(3);
    for (const state of laterStates) service.advanceClaim(state);
    const claimEvents = service.getSnapshot().auditEvents.filter((event) => event.aggregateId === "claim-demo-001");
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

  it("derives readiness directly from pass count", () => {
    const checks = runPreflight(repository.getState().member);
    expect(calculateReadiness(checks).percentage).toBe(71);
    checks[5] = { ...checks[5], status: "PASS" };
    expect(calculateReadiness(checks).percentage).toBe(86);
    checks[6] = { ...checks[6], status: "PASS" };
    expect(calculateReadiness(checks).percentage).toBe(100);
  });
});
