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
            "The waiting period has passed and the synthetic UAN has verified Aadhaar and mobile status, so the member can use Mark Exit.",
          responsibleParty: member.name,
          requiredAction: "Review and confirm the synthetic Date of Exit in Manage.",
          nextState: "ACTION_REQUIRED",
        }
      : {
          issueId: issue.id,
          resolutionType: "EMPLOYER_ACTION",
          explanation:
            "The member does not meet the synthetic self-service conditions, so the previous employer must review the record.",
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
        "This synthetic legacy service classification is outside the member self-service route and needs employer evidence review.",
      responsibleParty: "Demo Systems Pvt Ltd",
      requiredAction: "Create a request for the demo employer to review.",
      nextState: "WAITING_EXTERNAL",
    };
  }

  if (issue.type === "BANK_NOT_READY") {
    return {
      issueId: issue.id,
      resolutionType: "SELF_SERVICE",
      explanation:
        "The member can provide bank details for simulated Bank / NPCI verification. Employer approval is not part of this route.",
      responsibleParty: "Member and Bank / NPCI · Simulation",
      requiredAction: "Submit synthetic bank details for automatic verification.",
      nextState: "ACTION_REQUIRED",
    };
  }

  if (member.policy.uanAadhaarValidated && !member.policy.uanIssuedBeforeProfileCutoff) {
    return {
      issueId: issue.id,
      resolutionType: "SELF_SERVICE",
      explanation:
        "The synthetic Aadhaar-validated UAN qualifies for member self-service profile correction.",
      responsibleParty: member.name,
      requiredAction: "Review and confirm the corrected profile value.",
      nextState: "ACTION_REQUIRED",
    };
  }

  return {
    issueId: issue.id,
    resolutionType: "EMPLOYER_ACTION",
    explanation:
      "This synthetic profile exception falls outside the self-service policy conditions.",
    responsibleParty: "Demo Systems Pvt Ltd",
    requiredAction: "Create an employer review request.",
    nextState: "WAITING_EXTERNAL",
  };
}
