import type { Member, PreflightCheck } from "@/domain/schemas";

const EXIT_ISSUE_ID = "issue-exit-date";
const TRANSFER_ISSUE_ID = "issue-old-balance";

export function runPreflight(member: Member): PreflightCheck[] {
  const previousEmployments = member.employments.filter((record) => !record.isCurrent);
  const exitDatesRecorded = previousEmployments.every(
    (record) => record.exitStatus === "VERIFIED" && record.pfRecordExitDate !== null,
  );
  const oldBalancesTransferred = previousEmployments.every(
    (record) => record.transferStatus === "TRANSFERRED" || record.pfBalancePaise === 0,
  );
  const eligible =
    member.requestedWithdrawalPaise > 0 &&
    member.requestedWithdrawalPaise <= member.currentPfBalancePaise;
  const hasRequiredInformation =
    member.name.trim().length > 0 &&
    member.employments.some((record) => record.isCurrent && record.pfRecordStatus === "ACTIVE");

  return [
    {
      id: "IDENTITY_VERIFIED",
      label: "Identity verified",
      status: member.identity.aadhaarStatus === "VERIFIED" ? "PASS" : "BLOCK",
      reason: "The synthetic identity record is verified.",
      userExplanation: "Your identity details match this synthetic PF profile.",
      responsibleParty: "EPFO One checks",
      recommendedAction: "No action needed.",
    },
    {
      id: "PAN_VERIFIED",
      label: "PAN verified",
      status: member.identity.panStatus === "VERIFIED" ? "PASS" : "BLOCK",
      reason: "The synthetic PAN record is verified.",
      userExplanation: "Your tax identity check is complete for this prototype.",
      responsibleParty: "EPFO One checks",
      recommendedAction: "No action needed.",
    },
    {
      id: "BANK_VERIFIED",
      label: "Bank details verified",
      status: member.identity.bankStatus === "VERIFIED" ? "PASS" : "BLOCK",
      reason: "The synthetic bank destination is verified.",
      userExplanation: "A verified mock destination is ready to receive payment.",
      responsibleParty: "EPFO One checks",
      recommendedAction: "No action needed.",
    },
    {
      id: "WITHDRAWAL_ELIGIBILITY",
      label: "Withdrawal amount eligible",
      status: eligible ? "PASS" : "BLOCK",
      reason: eligible
        ? "The requested amount is within the synthetic available balance."
        : "The requested amount exceeds the synthetic available balance.",
      userExplanation: eligible
        ? "Your requested amount can proceed to record checks."
        : "Choose an amount within the available synthetic balance.",
      responsibleParty: "EPFO One rules engine",
      recommendedAction: eligible ? "No action needed." : "Change the withdrawal amount.",
    },
    {
      id: "PREVIOUS_EMPLOYMENT_EXIT_RECORDED",
      label: "Previous employment is closed",
      status: exitDatesRecorded ? "PASS" : "BLOCK",
      reason: exitDatesRecorded
        ? "Every previous employment record has a verified Date of Exit."
        : "Demo Systems Pvt Ltd has no Date of Exit in the synthetic PF record.",
      userExplanation: exitDatesRecorded
        ? "Your previous employment records are formally closed."
        : "The older employment still appears open in the PF record, so this claim cannot move forward yet.",
      responsibleParty: exitDatesRecorded ? "EPFO One checks" : "Demo Systems Pvt Ltd",
      recommendedAction: exitDatesRecorded
        ? "No action needed."
        : "Ask the previous employer to confirm your Date of Exit.",
      ...(exitDatesRecorded ? {} : { issueId: EXIT_ISSUE_ID }),
    },
    {
      id: "OLD_BALANCE_TRANSFERRED",
      label: "Old PF balance reconciled",
      status: oldBalancesTransferred ? "PASS" : "BLOCK",
      reason: oldBalancesTransferred
        ? "No balance remains stranded in an older employment record."
        : "₹42,600 remains in the Demo Systems Pvt Ltd employment record.",
      userExplanation: oldBalancesTransferred
        ? "Your employment balances are aligned for this withdrawal journey."
        : "Part of your PF is still attached to an older job and needs a synthetic transfer reconciliation.",
      responsibleParty: oldBalancesTransferred
        ? "EPFO One checks"
        : "EPFO Processing · Simulation",
      recommendedAction: oldBalancesTransferred
        ? "No action needed."
        : "Start a synthetic transfer reconciliation.",
      ...(oldBalancesTransferred ? {} : { issueId: TRANSFER_ISSUE_ID }),
    },
    {
      id: "REQUIRED_INFORMATION_COMPLETE",
      label: "Required information complete",
      status: hasRequiredInformation ? "PASS" : "BLOCK",
      reason: hasRequiredInformation
        ? "The synthetic member and active employment details are complete."
        : "Required synthetic member information is incomplete.",
      userExplanation: hasRequiredInformation
        ? "We have the information needed to prepare the claim."
        : "Complete the missing profile information before continuing.",
      responsibleParty: "Aarav Sharma",
      recommendedAction: hasRequiredInformation ? "No action needed." : "Complete the profile.",
    },
  ];
}

export function hasBlockingChecks(checks: PreflightCheck[]): boolean {
  return checks.some((check) => check.status === "BLOCK");
}
