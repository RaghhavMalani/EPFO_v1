import { evaluateAdvancePolicy } from "@/domain/advance-policy";
import { createAuditEvent, type AuditContext } from "@/domain/audit";
import { expectedContributionFromWage } from "@/domain/contribution-health";
import { calculateEcrTotal } from "@/domain/ecr-engine";
import type { AdvanceGoal, EcrRow, TransferState } from "@/domain/experience-v2";
import { TRANSFER_SEQUENCE, transitionTransfer } from "@/domain/transfer-machine";
import type { EpfoRepository } from "@/repositories/epfo-repository";

export class ExperienceV2ApplicationService {
  private readonly context: AuditContext;

  constructor(
    private readonly repository: EpfoRepository,
    now: () => Date = () => new Date(),
    createId: (prefix: string) => string = (prefix) => `${prefix}-${crypto.randomUUID()}`,
  ) {
    this.context = { now, createId };
  }

  setAdvanceGoal(goal: AdvanceGoal, requestedAmountPaise = 0) {
    const state = this.repository.getState();
    state.experience.advance = evaluateAdvancePolicy({
      member: state.member,
      goal,
      latestWageBasisPaise: 2_400_000,
      requestedAmountPaise,
      now: this.context.now().toISOString(),
    });
    state.auditEvents.push(createAuditEvent({
      aggregateType: "ADVANCE", aggregateId: state.experience.advance.id,
      eventType: "ADVANCE_PREFLIGHT_COMPLETED", actorType: "SYSTEM",
      actorName: "Advance Policy Engine",
      metadata: { goal, eligible: state.experience.advance.eligible, maximumEligibleAmountPaise: state.experience.advance.maximumEligibleAmountPaise },
    }, this.context));
    this.repository.saveState(state);
    return state.experience.advance;
  }

  submitAdvance(requestedAmountPaise: number) {
    const state = this.repository.getState();
    const advance = state.experience.advance;
    if (!advance.eligible || advance.state !== "READY") throw new Error("This advance is not ready to submit.");
    if (requestedAmountPaise <= 0 || requestedAmountPaise > advance.maximumEligibleAmountPaise) {
      throw new Error("Requested amount exceeds the deterministic eligible amount.");
    }
    advance.requestedAmountPaise = requestedAmountPaise;
    advance.state = "SUBMITTED";
    advance.updatedAt = this.context.now().toISOString();
    state.auditEvents.push(createAuditEvent({
      aggregateType: "ADVANCE", aggregateId: advance.id, eventType: "ADVANCE_SUBMITTED",
      actorType: "CITIZEN", actorName: state.member.name, metadata: { requestedAmountPaise },
    }, this.context));
    state.experience.memberActivities.push({
      id: this.context.createId("activity"), type: "CLAIM_UPDATED",
      title: "Medical PF advance submitted", detail: "The synthetic advance is now with EPFO for processing.",
      timestamp: advance.updatedAt, amountPaise: requestedAmountPaise, href: "/claims",
    });
    this.repository.saveState(state);
    return advance;
  }

  resolveTransferBlocker() {
    const state = this.repository.getState();
    const transfer = state.experience.transfer;
    transfer.checks = transfer.checks.map((check) => check.id === "PREVIOUS_RECORD"
      ? { ...check, status: "PASS", explanation: "The previous employer aligned the synthetic service record." }
      : check);
    state.experience.transfer = transitionTransfer(transfer, "READY", this.context.now().toISOString());
    state.auditEvents.push(createAuditEvent({
      aggregateType: "TRANSFER", aggregateId: transfer.id, eventType: "TRANSFER_READY",
      actorType: "EMPLOYER", actorName: "Demo Systems Pvt Ltd", metadata: { resolvedCheck: "PREVIOUS_RECORD" },
    }, this.context));
    this.repository.saveState(state);
    return state.experience.transfer;
  }

  transitionTransfer(nextState: TransferState) {
    const state = this.repository.getState();
    const transfer = state.experience.transfer;
    state.experience.transfer = transitionTransfer(transfer, nextState, this.context.now().toISOString());
    state.auditEvents.push(createAuditEvent({
      aggregateType: "TRANSFER", aggregateId: transfer.id, eventType: `TRANSFER_${nextState}`,
      actorType: nextState === "SUBMITTED" ? "CITIZEN" : "SYSTEM",
      actorName: nextState === "SUBMITTED" ? state.member.name : "Transfer Processor",
      metadata: { previousState: transfer.state, nextState, amountPaise: transfer.amountPaise },
    }, this.context));
    if (nextState === "BALANCE_MOVED") {
      state.experience.memberActivities.push({
        id: this.context.createId("activity"), type: "TRANSFER_UPDATED", title: "PF balance moved to NextGen Labs",
        detail: "The previous balance was consolidated under the current synthetic member record.",
        timestamp: this.context.now().toISOString(), amountPaise: transfer.amountPaise, href: `/transfers/${transfer.id}`,
      });
    }
    this.repository.saveState(state);
    return state.experience.transfer;
  }

  advanceTransferToNextState() {
    const transfer = this.repository.getState().experience.transfer;
    const nextState = TRANSFER_SEQUENCE[TRANSFER_SEQUENCE.indexOf(transfer.state) + 1];
    if (!nextState) throw new Error("Transfer is already complete.");
    return this.transitionTransfer(nextState);
  }

  correctEcrRow(ecrId: string, rowId: string) {
    const state = this.repository.getState();
    const ecr = state.experience.ecrs.find((item) => item.id === ecrId);
    if (!ecr) throw new Error("ECR submission not found.");
    const row = ecr.rows.find((item) => item.id === rowId);
    if (!row) throw new Error("ECR row not found.");
    const expected = expectedContributionFromWage(row.wagePaise);
    const corrected: EcrRow = {
      ...row,
      memberId: row.employee === "Aarav Sharma" ? state.member.id : row.memberId,
      uanMasked: row.issues.some((issue) => issue.code === "DUPLICATE_EMPLOYEE") ? `${row.uanMasked}-C` : row.uanMasked,
      employeeContributionPaise: expected.employeePaise,
      employerContributionPaise: expected.employerPaise,
      epsContributionPaise: expected.epsPaise,
      status: "READY", issues: [],
    };
    ecr.rows = ecr.rows.map((item) => item.id === rowId ? corrected : item);
    ecr.totalContributionPaise = calculateEcrTotal(ecr.rows);
    ecr.state = ecr.rows.every((item) => item.status === "READY") ? "READY" : "NEEDS_CORRECTION";
    ecr.updatedAt = this.context.now().toISOString();
    state.auditEvents.push(createAuditEvent({
      aggregateType: "ECR", aggregateId: ecr.id, eventType: "ECR_ROW_CORRECTED",
      actorType: "EMPLOYER", actorName: state.employer.name, metadata: { rowId, employee: row.employee, ecrState: ecr.state },
    }, this.context));
    this.repository.saveState(state);
    return ecr;
  }

  generateChallan(ecrId: string) {
    const state = this.repository.getState();
    const ecr = state.experience.ecrs.find((item) => item.id === ecrId);
    if (!ecr) throw new Error("ECR submission not found.");
    if (ecr.state !== "READY") throw new Error("Resolve all ECR issues before generating a challan.");
    ecr.state = "CHALLAN_GENERATED";
    ecr.challanId = `CHN-DEMO-${ecr.month.replace("-", "")}-001`;
    ecr.updatedAt = this.context.now().toISOString();
    state.auditEvents.push(createAuditEvent({
      aggregateType: "ECR", aggregateId: ecr.id, eventType: "ECR_CHALLAN_GENERATED",
      actorType: "EMPLOYER", actorName: state.employer.name,
      metadata: { challanId: ecr.challanId, totalContributionPaise: ecr.totalContributionPaise },
    }, this.context));
    this.repository.saveState(state);
    return ecr;
  }

  simulateEcrPayment(ecrId: string) {
    const state = this.repository.getState();
    const ecr = state.experience.ecrs.find((item) => item.id === ecrId);
    if (!ecr) throw new Error("ECR submission not found.");
    if (ecr.state !== "CHALLAN_GENERATED") throw new Error("Generate a challan before simulating payment.");
    const now = this.context.now().toISOString();
    ecr.state = "PAYMENT_COMPLETED";
    ecr.updatedAt = now;
    state.auditEvents.push(createAuditEvent({
      aggregateType: "ECR", aggregateId: ecr.id, eventType: "ECR_PAYMENT_COMPLETED",
      actorType: "EMPLOYER", actorName: state.employer.name,
      metadata: { challanId: ecr.challanId, totalContributionPaise: ecr.totalContributionPaise },
    }, this.context));
    const memberRow = ecr.rows.find((row) => row.memberId === state.member.id);
    if (!memberRow) throw new Error("The ECR does not contain the shared synthetic member.");
    const contributionId = `contribution-${ecr.month}`;
    if (!state.experience.contributions.some((item) => item.id === contributionId)) {
      state.experience.contributions.push({
        id: contributionId, memberId: state.member.id, employmentId: "employment-demo-systems",
        employerId: state.employer.id, employerName: state.employer.name, month: ecr.month,
        employeeContributionPaise: memberRow.employeeContributionPaise,
        employerEpfContributionPaise: memberRow.employerContributionPaise,
        epsContributionPaise: memberRow.epsContributionPaise, wageBasisPaise: memberRow.wagePaise,
        postingStatus: "POSTED", postedAt: now, sourceEcrId: ecr.id,
        explanation: "This contribution was posted from the completed synthetic employer ECR payment.",
      });
      const pfIncrease = memberRow.employeeContributionPaise + memberRow.employerContributionPaise;
      state.member.currentPfBalancePaise += pfIncrease;
      state.member.employments.at(-1)!.pfBalancePaise += pfIncrease;
      state.experience.memberActivities.push({
        id: this.context.createId("activity"), type: "CONTRIBUTION_POSTED", title: "August contribution posted",
        detail: `${state.employer.name} completed the synthetic ECR payment.`, timestamp: now,
        amountPaise: pfIncrease, href: "/passbook",
      });
      state.auditEvents.push(createAuditEvent({
        aggregateType: "CONTRIBUTION", aggregateId: contributionId, eventType: "CONTRIBUTION_POSTED",
        actorType: "SYSTEM", actorName: "Contribution Ledger",
        metadata: { sourceEcrId: ecr.id, memberId: state.member.id, amountPaise: pfIncrease },
      }, this.context));
    }
    this.repository.saveState(state);
    return ecr;
  }
}
