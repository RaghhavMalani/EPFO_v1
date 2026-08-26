import type { Member, PreflightCheck } from "@/domain/schemas";

const EXIT_ISSUE_ID = "issue-exit-date";
const LEGACY_ISSUE_ID = "issue-legacy-record";

export function runPreflight(member: Member): PreflightCheck[] {
  const exitRecorded = member.employments.every(
    (record) => record.isCurrent || (record.exitStatus === "VERIFIED" && record.pfRecordExitDate),
  );
  const legacyRecordsAligned = member.employments.every(
    (record) => record.legacyRecordStatus === "ALIGNED",
  );

  return [
    {
      id: "IDENTITY_VERIFIED",
      label: "Identity verified",
      status: member.identity.identityStatus === "VERIFIED" ? "PASS" : "BLOCK",
      reason: "The synthetic member identity is verified.",
      userExplanation: "Your core identity details match this synthetic UAN profile.",
      responsibleParty: "EPFO One checks",
      recommendedAction: "No action needed.",
    },
    {
      id: "AADHAAR_LINKED",
      label: "Aadhaar linked",
      status: member.identity.aadhaarStatus === "VERIFIED" ? "PASS" : "BLOCK",
      reason: "The masked synthetic Aadhaar status is verified.",
      userExplanation: "Your synthetic UAN is linked to a verified identity record.",
      responsibleParty: "EPFO One checks",
      recommendedAction: "No action needed.",
    },
    {
      id: "PAN_VERIFIED",
      label: "PAN verified",
      status: member.identity.panStatus === "VERIFIED" ? "PASS" : "BLOCK",
      reason: "The synthetic PAN status is verified.",
      userExplanation: "Your tax identity check is complete for this prototype.",
      responsibleParty: "EPFO One checks",
      recommendedAction: "No action needed.",
    },
    {
      id: "MOBILE_VERIFIED",
      label: "Mobile verified",
      status: member.identity.mobileStatus === "VERIFIED" ? "PASS" : "BLOCK",
      reason: "The masked synthetic mobile status is verified.",
      userExplanation: "A verified synthetic mobile is available for member self-service checks.",
      responsibleParty: "EPFO One checks",
      recommendedAction: "No action needed.",
    },
    {
      id: "BANK_VERIFIED",
      label: "Bank verified",
      status: member.identity.bankStatus === "VERIFIED" ? "PASS" : "BLOCK",
      reason: "Bank and NPCI verification is complete in the synthetic record.",
      userExplanation: "The payment destination is ready without an employer approval step.",
      responsibleParty: "Bank / NPCI verification · Simulation",
      recommendedAction: "No action needed.",
    },
    {
      id: "EXIT_DATE_RECORDED",
      label: "Date of Exit recorded",
      status: exitRecorded ? "PASS" : "BLOCK",
      reason: exitRecorded
        ? "Every previous employment record has a Date of Exit."
        : "Demo Systems Pvt Ltd has no Date of Exit in the synthetic PF record.",
      userExplanation: exitRecorded
        ? "Your last employment record is formally closed."
        : "You left more than 60 days ago and can now mark this date yourself in the synthetic flow.",
      responsibleParty: exitRecorded ? "EPFO One checks" : "Aarav Sharma",
      recommendedAction: exitRecorded ? "No action needed." : "Use Manage to mark your Date of Exit.",
      ...(exitRecorded ? {} : { issueId: EXIT_ISSUE_ID }),
    },
    {
      id: "LEGACY_RECORD_ALIGNED",
      label: "Legacy employment record aligned",
      status: legacyRecordsAligned ? "PASS" : "BLOCK",
      reason: legacyRecordsAligned
        ? "Every synthetic member record is aligned under this UAN."
        : "A legacy service-end detail needs employer review in this demo scenario.",
      userExplanation: legacyRecordsAligned
        ? "Your employment records are ready for final settlement."
        : "This exception cannot be self-approved. Demo Systems must review the proposed correction.",
      responsibleParty: legacyRecordsAligned
        ? "EPFO One checks"
        : "Demo Systems Pvt Ltd",
      recommendedAction: legacyRecordsAligned
        ? "No action needed."
        : "Create a synthetic employer review request.",
      ...(legacyRecordsAligned ? {} : { issueId: LEGACY_ISSUE_ID }),
    },
  ];
}

export function hasBlockingChecks(checks: PreflightCheck[]): boolean {
  return checks.some((check) => check.status === "BLOCK");
}
