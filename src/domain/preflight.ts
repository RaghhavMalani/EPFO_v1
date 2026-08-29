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
  // Name the establishment that actually owns each blocker rather than a constant, so
  // the copy stays correct if the scenario ever grows a second unclosed record.
  const exitBlockerEmployer = member.employments.find(
    (record) => !record.isCurrent && !(record.exitStatus === "VERIFIED" && record.pfRecordExitDate),
  )?.employerName;
  const legacyBlockerEmployer = member.employments.find(
    (record) => record.legacyRecordStatus !== "ALIGNED",
  )?.employerName;

  return [
    {
      id: "IDENTITY_VERIFIED",
      label: "Identity verified",
      status: member.identity.identityStatus === "VERIFIED" ? "PASS" : "BLOCK",
      reason: "Name, date of birth, and UAN profile all match.",
      userExplanation: "Your core identity details match the profile held against your UAN.",
      responsibleParty: "EPFO One checks",
      recommendedAction: "No action needed.",
    },
    {
      id: "AADHAAR_LINKED",
      label: "Aadhaar linked",
      status: member.identity.aadhaarStatus === "VERIFIED" ? "PASS" : "BLOCK",
      reason: "Aadhaar is seeded and validated against the UAN.",
      userExplanation: "Your UAN is linked to a verified Aadhaar record.",
      responsibleParty: "EPFO One checks",
      recommendedAction: "No action needed.",
    },
    {
      id: "PAN_VERIFIED",
      label: "PAN verified",
      status: member.identity.panStatus === "VERIFIED" ? "PASS" : "BLOCK",
      reason: "PAN is seeded against the member record.",
      userExplanation: "Your PAN is on file, so tax deduction will be applied at the correct rate.",
      responsibleParty: "EPFO One checks",
      recommendedAction: "No action needed.",
    },
    {
      id: "MOBILE_VERIFIED",
      label: "Mobile verified",
      status: member.identity.mobileStatus === "VERIFIED" ? "PASS" : "BLOCK",
      reason: "A verified mobile number is on the member record.",
      userExplanation: "A verified mobile number is on file, so you can authorise changes yourself.",
      responsibleParty: "EPFO One checks",
      recommendedAction: "No action needed.",
    },
    {
      id: "BANK_VERIFIED",
      label: "Bank verified",
      status: member.identity.bankStatus === "VERIFIED" ? "PASS" : "BLOCK",
      reason: "Bank account and NPCI verification are both complete.",
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
        : `${exitBlockerEmployer ?? "Your last employer"} has not recorded a Date of Exit against this PF record.`,
      userExplanation: exitRecorded
        ? "Your last employment record is formally closed."
        : "You left more than 60 days ago, so you can now record this date yourself.",
      responsibleParty: exitRecorded ? "EPFO One checks" : member.name,
      recommendedAction: exitRecorded ? "No action needed." : "Use Manage to mark your Date of Exit.",
      ...(exitRecorded ? {} : { issueId: EXIT_ISSUE_ID }),
    },
    {
      id: "LEGACY_RECORD_ALIGNED",
      label: "Legacy employment record aligned",
      status: legacyRecordsAligned ? "PASS" : "BLOCK",
      reason: legacyRecordsAligned
        ? "Every member record under this UAN is aligned."
        : "A service-end detail on an older record does not match and needs employer review.",
      userExplanation: legacyRecordsAligned
        ? "Your employment records are ready for final settlement."
        : `This one cannot be fixed from your side. ${legacyBlockerEmployer ?? "Your employer"} has to review the correction.`,
      responsibleParty: legacyRecordsAligned
        ? "EPFO One checks"
        : (legacyBlockerEmployer ?? "Your employer"),
      recommendedAction: legacyRecordsAligned
        ? "No action needed."
        : "Send the correction to your employer for review.",
      ...(legacyRecordsAligned ? {} : { issueId: LEGACY_ISSUE_ID }),
    },
  ];
}

export function hasBlockingChecks(checks: PreflightCheck[]): boolean {
  return checks.some((check) => check.status === "BLOCK");
}
