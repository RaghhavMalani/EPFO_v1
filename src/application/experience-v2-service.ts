import { nextAdvanceState, transitionAdvance } from "@/domain/advance-machine";
import { evaluateAdvancePolicy } from "@/domain/advance-policy";
import { createAuditEvent, type AuditContext } from "@/domain/audit";
import { summarisePassbook, type PassbookSummary } from "@/domain/contribution-health";
import {
  calculateEcrTotal,
  correctEcrRow,
  validateEcrRows,
  type EcrRowCorrection,
  type MemberDirectory,
} from "@/domain/ecr-engine";
import { deriveEcrValidationState, transitionEcr } from "@/domain/ecr-machine";
import type {
  AdvanceApplication,
  AdvanceGoal,
  AdvanceState,
  EcrSubmission,
  ExperienceV2State,
  TransferApplication,
  TransferState,
} from "@/domain/experience-v2";
import { nextTransferState, transitionTransfer } from "@/domain/transfer-machine";
import type { AppState, EmploymentRecord } from "@/domain/schemas";
import type { EpfoRepository } from "@/repositories/epfo-repository";

/** The synthetic payroll roster this establishment employs. */
const SYNTHETIC_ROSTER_MEMBER_ID = /^member-payroll-\d+$/;

export type ExperienceV2ReadModel = ExperienceV2State & {
  passbook: PassbookSummary;
};

function requireEmployment(state: AppState, employmentId: string): EmploymentRecord {
  const employment = state.member.employments.find((record) => record.id === employmentId);
  if (!employment) {
    throw new Error(`Employment record ${employmentId} was not found.`);
  }
  return employment;
}

function requireEcr(state: AppState, ecrId: string): EcrSubmission {
  const ecr = state.experience.ecrs.find((item) => item.id === ecrId);
  if (!ecr) {
    throw new Error("ECR submission not found.");
  }
  return ecr;
}

/**
 * Coordinates the Experience V2 domain engines and persists their results.
 *
 * Every eligibility decision, monetary amount, contribution health verdict, transfer
 * state, and ECR verdict is produced by `src/domain`. This service only sequences those
 * calls, records audit events, and saves state.
 */
export class ExperienceV2ApplicationService {
  private readonly context: AuditContext;

  constructor(
    private readonly repository: EpfoRepository,
    now: () => Date = () => new Date(),
    createId: (prefix: string) => string = (prefix) => `${prefix}-${crypto.randomUUID()}`,
  ) {
    this.context = { now, createId };
  }

  private timestamp() {
    return this.context.now().toISOString();
  }

  /** The masked-UAN directory used to link payroll rows back to member records. */
  private memberDirectory(state: AppState): MemberDirectory {
    return new Map([[state.member.uanMasked, state.member.id]]);
  }

  /**
   * Whether a payroll row's member id is linked to an employment record at this
   * establishment. The synthetic employer roster is the `member-payroll-N` series;
   * the shared member is linked through their own record.
   */
  private isLinkedMember(state: AppState) {
    return (memberId: string) =>
      memberId === state.member.id || SYNTHETIC_ROSTER_MEMBER_ID.test(memberId);
  }

  /** The employment record the shared member holds at this establishment. */
  private employerEmployment(state: AppState): EmploymentRecord {
    const employment = state.member.employments.find(
      (record) => record.employerName === state.employer.name,
    );
    if (!employment) {
      throw new Error(`No employment record links the member to ${state.employer.name}.`);
    }
    return employment;
  }

  /** The latest wage basis on record, used by the Form 31 ceiling. */
  private latestWageBasisPaise(state: AppState) {
    const latest = [...state.experience.contributions].sort((a, b) => a.month.localeCompare(b.month)).at(-1);
    return latest?.wageBasisPaise ?? 0;
  }

  getExperience(): ExperienceV2ReadModel {
    const state = this.repository.getState();
    return { ...state.experience, passbook: summarisePassbook(state.experience.contributions) };
  }

  getPassbook(): PassbookSummary {
    return summarisePassbook(this.repository.getState().experience.contributions);
  }

  // ---------------------------------------------------------------- Form 31 advance

  setAdvanceGoal(goal: AdvanceGoal, requestedAmountPaise = 0): AdvanceApplication {
    const state = this.repository.getState();
    const advance = evaluateAdvancePolicy({
      member: state.member,
      goal,
      latestWageBasisPaise: this.latestWageBasisPaise(state),
      requestedAmountPaise,
      now: this.timestamp(),
    });
    state.experience.advance = advance;
    state.auditEvents.push(createAuditEvent({
      aggregateType: "ADVANCE",
      aggregateId: advance.id,
      eventType: "ADVANCE_PREFLIGHT_COMPLETED",
      actorType: "SYSTEM",
      actorName: "Advance Policy Engine",
      metadata: {
        goal,
        eligible: advance.eligible,
        maximumEligibleAmountPaise: advance.maximumEligibleAmountPaise,
        blockingChecks: advance.blockingChecks.join(",") || "NONE",
      },
    }, this.context));
    this.repository.saveState(state);
    return advance;
  }

  submitAdvance(requestedAmountPaise: number): AdvanceApplication {
    const state = this.repository.getState();
    const now = this.timestamp();
    const advance = transitionAdvance(
      { ...state.experience.advance, requestedAmountPaise },
      "SUBMITTED",
      now,
    );
    state.experience.advance = advance;
    state.auditEvents.push(createAuditEvent({
      aggregateType: "ADVANCE",
      aggregateId: advance.id,
      eventType: "ADVANCE_SUBMITTED",
      actorType: "CITIZEN",
      actorName: state.member.name,
      metadata: { goal: advance.goal, requestedAmountPaise },
    }, this.context));
    state.experience.memberActivities.push({
      id: this.context.createId("activity"),
      type: "CLAIM_UPDATED",
      title: "PF advance submitted",
      detail: "The synthetic advance is now with EPFO for processing.",
      timestamp: now,
      amountPaise: requestedAmountPaise,
      href: "/claims",
    });
    this.repository.saveState(state);
    return advance;
  }

  transitionAdvance(nextState: AdvanceState): AdvanceApplication {
    const state = this.repository.getState();
    const previous = state.experience.advance;
    const now = this.timestamp();
    const advance = transitionAdvance(previous, nextState, now);
    state.experience.advance = advance;
    state.auditEvents.push(createAuditEvent({
      aggregateType: "ADVANCE",
      aggregateId: advance.id,
      eventType: `ADVANCE_${nextState}`,
      actorType: nextState === "CREDITED" ? "BANK" : "SYSTEM",
      actorName: nextState === "CREDITED" ? "Synthetic Settlement Bank" : "Advance Processor",
      metadata: {
        previousState: previous.state,
        nextState,
        requestedAmountPaise: advance.requestedAmountPaise,
      },
    }, this.context));

    if (nextState === "CREDITED") {
      state.member.currentPfBalancePaise -= advance.requestedAmountPaise;
      state.experience.pastClaims.push({
        id: `claim-${advance.id}`,
        type: "FORM_31",
        label: "PF advance",
        amountPaise: advance.requestedAmountPaise,
        submittedAt: advance.createdAt,
        completedAt: now,
        state: "CREDITED",
      });
      state.experience.memberActivities.push({
        id: this.context.createId("activity"),
        type: "CLAIM_UPDATED",
        title: "PF advance credited",
        detail: "The synthetic advance was credited to the masked bank account.",
        timestamp: now,
        amountPaise: advance.requestedAmountPaise,
        href: "/claims",
      });
    }

    this.repository.saveState(state);
    return advance;
  }

  advanceAdvanceToNextState(): AdvanceApplication {
    const next = nextAdvanceState(this.repository.getState().experience.advance.state);
    if (!next) throw new Error("The advance is already complete.");
    return this.transitionAdvance(next);
  }

  // ------------------------------------------------------------ Form 13 PF transfer

  resolveTransferBlocker(): TransferApplication {
    const state = this.repository.getState();
    const now = this.timestamp();
    const resolved = {
      ...state.experience.transfer,
      checks: state.experience.transfer.checks.map((check) =>
        check.id === "PREVIOUS_RECORD"
          ? { ...check, status: "PASS" as const, explanation: "The previous employer aligned the synthetic service record." }
          : check,
      ),
    };
    const transfer = transitionTransfer(resolved, "READY", now);
    state.experience.transfer = transfer;
    state.auditEvents.push(createAuditEvent({
      aggregateType: "TRANSFER",
      aggregateId: transfer.id,
      eventType: "TRANSFER_READY",
      actorType: "EMPLOYER",
      actorName: "Demo Systems Pvt Ltd",
      metadata: { resolvedCheck: "PREVIOUS_RECORD", previousState: "DRAFT", nextState: "READY" },
    }, this.context));
    this.repository.saveState(state);
    return transfer;
  }

  transitionTransfer(nextState: TransferState): TransferApplication {
    const state = this.repository.getState();
    const previous = state.experience.transfer;
    const now = this.timestamp();
    const transfer = transitionTransfer(previous, nextState, now);
    state.experience.transfer = transfer;

    state.auditEvents.push(createAuditEvent({
      aggregateType: "TRANSFER",
      aggregateId: transfer.id,
      eventType: `TRANSFER_${nextState}`,
      actorType: nextState === "SUBMITTED" ? "CITIZEN" : "SYSTEM",
      actorName: nextState === "SUBMITTED" ? state.member.name : "Transfer Processor",
      metadata: { previousState: previous.state, nextState, amountPaise: transfer.amountPaise },
    }, this.context));

    if (nextState === "BALANCE_MOVED") {
      this.applyTransferBalanceMove(state, transfer, now);
    }

    this.repository.saveState(state);
    return transfer;
  }

  /**
   * Consolidates the previous PF account into the receiving record. The money leaves the
   * previous employment, arrives in the current one, and joins the member's PF balance.
   */
  private applyTransferBalanceMove(state: AppState, transfer: TransferApplication, now: string) {
    const source = requireEmployment(state, transfer.previousEmploymentId);
    const target = requireEmployment(state, transfer.currentEmploymentId);
    const amountPaise = transfer.amountPaise;

    if (source.pfBalancePaise < amountPaise) {
      throw new Error("The previous employment record does not hold the transfer amount.");
    }

    source.pfBalancePaise -= amountPaise;
    source.transferredAmountPaise += amountPaise;
    source.transferStatus = "TRANSFERRED";
    target.pfBalancePaise += amountPaise;
    state.member.currentPfBalancePaise += amountPaise;

    state.auditEvents.push(createAuditEvent({
      aggregateType: "EMPLOYMENT_RECORD",
      aggregateId: source.id,
      eventType: "PF_BALANCE_TRANSFERRED",
      actorType: "SYSTEM",
      actorName: "Transfer Processor",
      metadata: { amountPaise, fromEmploymentId: source.id, toEmploymentId: target.id },
    }, this.context));

    state.experience.memberActivities.push({
      id: this.context.createId("activity"),
      type: "TRANSFER_UPDATED",
      title: `PF balance moved to ${target.employerName}`,
      detail: `The balance held under ${source.employerName} was consolidated into the current synthetic member record.`,
      timestamp: now,
      amountPaise,
      href: `/transfers/${transfer.id}`,
    });
  }

  advanceTransferToNextState(): TransferApplication {
    const next = nextTransferState(this.repository.getState().experience.transfer.state);
    if (!next) throw new Error("Transfer is already complete.");
    return this.transitionTransfer(next);
  }

  // ------------------------------------------------------------------- Employer ECR

  /** Re-runs deterministic validation over the file and records the resulting state. */
  validateEcr(ecrId: string): EcrSubmission {
    const state = this.repository.getState();
    const ecr = requireEcr(state, ecrId);
    const rows = validateEcrRows(ecr.rows, this.isLinkedMember(state));
    const validated = transitionEcr(
      { ...ecr, rows, totalContributionPaise: calculateEcrTotal(rows) },
      deriveEcrValidationState(rows),
      this.timestamp(),
    );
    state.experience.ecrs = state.experience.ecrs.map((item) => (item.id === ecrId ? validated : item));
    state.auditEvents.push(createAuditEvent({
      aggregateType: "ECR",
      aggregateId: ecr.id,
      eventType: "ECR_VALIDATED",
      actorType: "SYSTEM",
      actorName: "ECR Validation Engine",
      metadata: {
        ecrState: validated.state,
        rowsInIssue: rows.filter((row) => row.status === "ISSUE").length,
        totalContributionPaise: validated.totalContributionPaise,
      },
    }, this.context));
    this.repository.saveState(state);
    return validated;
  }

  correctEcrRow(ecrId: string, rowId: string, correction: EcrRowCorrection = {}): EcrSubmission {
    const state = this.repository.getState();
    const ecr = requireEcr(state, ecrId);
    const row = ecr.rows.find((item) => item.id === rowId);
    if (!row) throw new Error("ECR row not found.");

    const corrected = correctEcrRow(row, this.memberDirectory(state), correction);
    const rows = validateEcrRows(
      ecr.rows.map((item) => (item.id === rowId ? corrected : item)),
      this.isLinkedMember(state),
    );
    const updated = transitionEcr(
      { ...ecr, rows, totalContributionPaise: calculateEcrTotal(rows) },
      deriveEcrValidationState(rows),
      this.timestamp(),
    );
    state.experience.ecrs = state.experience.ecrs.map((item) => (item.id === ecrId ? updated : item));
    state.auditEvents.push(createAuditEvent({
      aggregateType: "ECR",
      aggregateId: ecr.id,
      eventType: "ECR_ROW_CORRECTED",
      actorType: "EMPLOYER",
      actorName: state.employer.name,
      metadata: {
        rowId,
        employee: corrected.employee,
        rowStatus: corrected.status,
        ecrState: updated.state,
      },
    }, this.context));
    this.repository.saveState(state);
    return updated;
  }

  generateChallan(ecrId: string): EcrSubmission {
    const state = this.repository.getState();
    const ecr = requireEcr(state, ecrId);
    const updated = transitionEcr(ecr, "CHALLAN_GENERATED", this.timestamp());
    updated.challanId = `CHN-DEMO-${ecr.month.replace("-", "")}-001`;
    state.experience.ecrs = state.experience.ecrs.map((item) => (item.id === ecrId ? updated : item));
    state.auditEvents.push(createAuditEvent({
      aggregateType: "ECR",
      aggregateId: ecr.id,
      eventType: "ECR_CHALLAN_GENERATED",
      actorType: "EMPLOYER",
      actorName: state.employer.name,
      metadata: { challanId: updated.challanId, totalContributionPaise: updated.totalContributionPaise },
    }, this.context));
    this.repository.saveState(state);
    return updated;
  }

  startEcrPayment(ecrId: string): EcrSubmission {
    const state = this.repository.getState();
    const ecr = requireEcr(state, ecrId);
    const updated = transitionEcr(ecr, "PAYMENT_PROCESSING", this.timestamp());
    state.experience.ecrs = state.experience.ecrs.map((item) => (item.id === ecrId ? updated : item));
    state.auditEvents.push(createAuditEvent({
      aggregateType: "ECR",
      aggregateId: ecr.id,
      eventType: "ECR_PAYMENT_STARTED",
      actorType: "EMPLOYER",
      actorName: state.employer.name,
      metadata: { challanId: updated.challanId, totalContributionPaise: updated.totalContributionPaise },
    }, this.context));
    this.repository.saveState(state);
    return updated;
  }

  /**
   * Completes the synthetic ECR payment. This is the cross-role moment: an employer
   * action posts a member contribution and moves the member's PF balance in shared
   * domain state.
   */
  completeEcrPayment(ecrId: string): EcrSubmission {
    const state = this.repository.getState();
    const ecr = requireEcr(state, ecrId);
    const now = this.timestamp();
    const paid = transitionEcr(ecr, "PAID", now);
    state.experience.ecrs = state.experience.ecrs.map((item) => (item.id === ecrId ? paid : item));

    state.auditEvents.push(createAuditEvent({
      aggregateType: "ECR",
      aggregateId: paid.id,
      eventType: "ECR_PAYMENT_COMPLETED",
      actorType: "EMPLOYER",
      actorName: state.employer.name,
      metadata: { challanId: paid.challanId, totalContributionPaise: paid.totalContributionPaise },
    }, this.context));

    this.postContributionFromEcr(state, paid, now);
    this.repository.saveState(state);
    return paid;
  }

  /** Posts the shared member's contribution for a paid ECR month. Idempotent per month. */
  private postContributionFromEcr(state: AppState, ecr: EcrSubmission, now: string) {
    const memberRow = ecr.rows.find(
      (row) => row.memberId === state.member.id && row.status === "READY",
    );
    if (!memberRow) {
      throw new Error("The ECR does not contain a payable row for the shared synthetic member.");
    }

    const contributionId = `contribution-${ecr.month}`;
    if (state.experience.contributions.some((item) => item.id === contributionId)) {
      return;
    }

    const employment = this.employerEmployment(state);
    state.experience.contributions.push({
      id: contributionId,
      memberId: state.member.id,
      employmentId: employment.id,
      employerId: state.employer.id,
      employerName: state.employer.name,
      month: ecr.month,
      employeeContributionPaise: memberRow.employeeContributionPaise,
      employerEpfContributionPaise: memberRow.employerContributionPaise,
      epsContributionPaise: memberRow.epsContributionPaise,
      wageBasisPaise: memberRow.wagePaise,
      postingStatus: "POSTED",
      postedAt: now,
      sourceEcrId: ecr.id,
      reconciliation: null,
      explanation: "This contribution was posted from the completed synthetic employer ECR payment.",
    });

    // Only the EPF shares build the PF balance; the EPS share funds the pension component.
    const pfIncrease = memberRow.employeeContributionPaise + memberRow.employerContributionPaise;
    employment.pfBalancePaise += pfIncrease;
    state.member.currentPfBalancePaise += pfIncrease;

    state.auditEvents.push(createAuditEvent({
      aggregateType: "CONTRIBUTION",
      aggregateId: contributionId,
      eventType: "CONTRIBUTION_POSTED",
      actorType: "SYSTEM",
      actorName: "Contribution Ledger",
      metadata: {
        sourceEcrId: ecr.id,
        memberId: state.member.id,
        month: ecr.month,
        amountPaise: pfIncrease,
      },
    }, this.context));

    state.experience.memberActivities.push({
      id: this.context.createId("activity"),
      type: "CONTRIBUTION_POSTED",
      title: `${ecr.month} contribution posted`,
      detail: `${state.employer.name} completed the synthetic ECR payment.`,
      timestamp: now,
      amountPaise: pfIncrease,
      href: "/passbook",
    });
  }
}
