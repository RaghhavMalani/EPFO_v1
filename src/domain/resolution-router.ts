import type {
  Issue,
  IssueStatus,
  Member,
  ResolutionType,
} from "@/domain/schemas";

export type ResolutionRoute = {
  issueId: string;
  resolutionType: ResolutionType;
  explanation: string;
  responsibleParty: string;
  requiredAction: string;
  nextState: IssueStatus;
};

export function routeResolution(issue: Issue, member: Member): ResolutionRoute {
  if (issue.type === "MISSING_EXIT_DATE") {
    const canMarkExit =
      member.policy.daysSinceLastExit >= member.policy.markExitWaitingPeriodDays &&
      member.policy.uanAadhaarValidated &&
      member.identity.mobileStatus === "VERIFIED";

    return canMarkExit
      ? {
          issueId: issue.id,
          resolutionType: "SELF_SERVICE",
          explanation:
            "The waiting period has passed and this UAN has verified Aadhaar and mobile details, so the member can record the exit themselves.",
          responsibleParty: member.name,
          requiredAction: "Review and confirm the Date of Exit in Manage.",
          nextState: "ACTION_REQUIRED",
        }
      : {
          issueId: issue.id,
          resolutionType: "EMPLOYER_ACTION",
          explanation:
            "The member does not meet the self-service conditions, so the previous employer has to review the record.",
          responsibleParty: "Demo Systems Pvt Ltd",
          requiredAction: "Create an employer review request.",
          nextState: "WAITING_EXTERNAL",
        };
  }

  if (issue.type === "LEGACY_EMPLOYMENT_EXCEPTION") {
    return {
      issueId: issue.id,
      resolutionType: "EMPLOYER_ACTION",
      explanation:
        "A legacy service classification cannot be corrected by the member and needs the employer to review the evidence.",
      responsibleParty: "Demo Systems Pvt Ltd",
      requiredAction: "Send the correction to the employer for review.",
      nextState: "WAITING_EXTERNAL",
    };
  }

  if (issue.type === "BANK_NOT_READY") {
    return {
      issueId: issue.id,
      resolutionType: "SELF_SERVICE",
      explanation:
        "The member can supply bank details for Bank / NPCI verification. No employer approval is needed on this route.",
      responsibleParty: "Member and Bank / NPCI · Simulation",
      requiredAction: "Submit bank details for automatic verification.",
      nextState: "ACTION_REQUIRED",
    };
  }

  if (member.policy.uanAadhaarValidated && !member.policy.uanIssuedBeforeProfileCutoff) {
    return {
      issueId: issue.id,
      resolutionType: "SELF_SERVICE",
      explanation:
        "An Aadhaar-validated UAN qualifies for member self-service profile correction.",
      responsibleParty: member.name,
      requiredAction: "Review and confirm the corrected profile value.",
      nextState: "ACTION_REQUIRED",
    };
  }

  return {
    issueId: issue.id,
    resolutionType: "EMPLOYER_ACTION",
    explanation:
      "This profile exception falls outside the self-service conditions.",
    responsibleParty: "Demo Systems Pvt Ltd",
    requiredAction: "Create an employer review request.",
    nextState: "WAITING_EXTERNAL",
  };
}
