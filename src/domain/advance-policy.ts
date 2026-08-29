import type { AdvanceApplication, AdvanceGoal, EligibilityCheck } from "@/domain/experience-v2";
import type { Member } from "@/domain/schemas";

const GOAL_LABELS: Record<AdvanceGoal, string> = {
  MEDICAL: "Medical treatment",
  MARRIAGE: "Marriage",
  EDUCATION: "Education",
  HOUSING: "Housing",
};

const REQUIRED_SERVICE_MONTHS: Record<AdvanceGoal, number> = {
  MEDICAL: 0,
  MARRIAGE: 84,
  EDUCATION: 84,
  HOUSING: 60,
};

export function completedServiceMonths(member: Member) {
  return member.employments.reduce((total, employment) => {
    const start = new Date(`${employment.employmentStart}T00:00:00.000Z`);
    const end = new Date(`${employment.employmentEnd ?? "2026-08-29"}T00:00:00.000Z`);
    return total + Math.max(0, Math.round((end.getTime() - start.getTime()) / 2_629_800_000));
  }, 0);
}

export function evaluateAdvancePolicy({
  member,
  goal,
  latestWageBasisPaise,
  requestedAmountPaise = 0,
  now = "2026-08-29T05:00:00.000Z",
}: {
  member: Member;
  goal: AdvanceGoal;
  latestWageBasisPaise: number;
  requestedAmountPaise?: number;
  now?: string;
}): AdvanceApplication {
  const serviceMonths = completedServiceMonths(member);
  const requiredMonths = REQUIRED_SERVICE_MONTHS[goal];
  const servicePasses = serviceMonths >= requiredMonths;
  const identityPasses = member.identity.identityStatus === "VERIFIED";
  const aadhaarPasses = member.identity.aadhaarStatus === "VERIFIED";
  const bankPasses = member.identity.bankStatus === "VERIFIED";
  const hasEmployment = member.employments.length > 0;

  const checks: EligibilityCheck[] = [
    { id: "IDENTITY", label: "Identity verified", status: identityPasses ? "PASS" : "BLOCK", explanation: identityPasses ? "Identity is verified." : "Verify identity before continuing." },
    { id: "AADHAAR", label: "Aadhaar linked", status: aadhaarPasses ? "PASS" : "BLOCK", explanation: aadhaarPasses ? "Aadhaar is linked to the synthetic UAN." : "Link Aadhaar before continuing." },
    { id: "BANK", label: "Bank verified", status: bankPasses ? "PASS" : "BLOCK", explanation: bankPasses ? "The masked bank account is verified." : "Verify a bank account before continuing." },
    { id: "EMPLOYMENT", label: "Employment record available", status: hasEmployment ? "PASS" : "BLOCK", explanation: hasEmployment ? "Employment records are available." : "An employment record is required." },
    { id: "SERVICE", label: "Required service period", status: servicePasses ? "PASS" : "BLOCK", explanation: requiredMonths === 0 ? "No minimum service period applies to this synthetic medical rule." : `${requiredMonths} months are required; ${serviceMonths} are available.` },
    { id: "ADVANCE_RULE", label: `${GOAL_LABELS[goal]} rule`, status: "PASS", explanation: "The selected purpose is supported by the synthetic policy engine." },
  ];

  const eligible = checks.every((check) => check.status === "PASS");
  const wageMultiple: Record<AdvanceGoal, number> = {
    MEDICAL: 3,
    MARRIAGE: 6,
    EDUCATION: 6,
    HOUSING: 36,
  };
  const maximumEligibleAmountPaise = eligible
    ? Math.min(member.currentPfBalancePaise, latestWageBasisPaise * wageMultiple[goal])
    : 0;

  return {
    id: "advance-demo-001",
    memberId: member.id,
    goal,
    requestedAmountPaise: Math.min(requestedAmountPaise, maximumEligibleAmountPaise),
    maximumEligibleAmountPaise,
    eligible,
    ruleExplanation: `${GOAL_LABELS[goal]} uses a synthetic wage-multiple rule and the available PF balance. The lower value becomes the maximum.`,
    checks,
    blockingChecks: checks.filter((check) => check.status === "BLOCK").map((check) => check.id),
    recommendedNextAction: eligible ? "Review the amount and masked bank account." : "Resolve the blocking checks before continuing.",
    state: eligible ? "READY" : "NOT_ELIGIBLE",
    createdAt: now,
    updatedAt: now,
  };
}
