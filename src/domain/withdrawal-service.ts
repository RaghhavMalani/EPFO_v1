import type { Member } from "@/domain/schemas";

export type WithdrawalServiceDecision = {
  goal: "FINAL_SETTLEMENT";
  serviceLabel: string;
  formReference: "FORM_19";
  eligibleForJourney: boolean;
  explanation: string;
};

export function determineWithdrawalService(member: Member): WithdrawalServiceDecision {
  const eligibleForJourney =
    member.employmentStatus === "NOT_EMPLOYED_IN_PF_ESTABLISHMENT" &&
    member.policy.daysSinceLastExit >= member.policy.markExitWaitingPeriodDays;

  return {
    goal: "FINAL_SETTLEMENT",
    serviceLabel: "Final PF settlement",
    formReference: "FORM_19",
    eligibleForJourney,
    explanation: eligibleForJourney
      ? "You are not currently employed in a PF-covered establishment and the synthetic waiting period has passed."
      : "This final-settlement journey is unavailable while active PF-covered employment or the waiting period applies.",
  };
}
