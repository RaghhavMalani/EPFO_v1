import type { AssistantResponse, Contribution } from "@/domain/experience-v2";
import type { Member } from "@/domain/schemas";

export function explainEpfoContext(
  question: string,
  member: Member,
  contributions: Contribution[],
): AssistantResponse {
  const normalized = question.toLowerCase();
  const march = contributions.find((item) => item.month === "2026-03");

  if (normalized.includes("march") || normalized.includes("lower") || normalized.includes("contribution")) {
    return {
      intent: "UNDERSTAND_CONTRIBUTION",
      likelyService: "Passbook",
      relevantAccountFacts: [
        `March employer EPF recorded: ₹${((march?.employerEpfContributionPaise ?? 0) / 100).toLocaleString("en-IN")}`,
        `March status: ${march?.postingStatus ?? "MISSING"}`,
        `Responsible employer: ${march?.employerName ?? "Demo Systems Pvt Ltd"}`,
      ],
      missingInformation: [],
      explanation: "The employee contribution was recorded, but the employer EPF value is lower than the deterministic wage-based expectation. Open March in Passbook to inspect the exact difference.",
    };
  }

  if (normalized.includes("changed jobs") || normalized.includes("transfer")) {
    return {
      intent: "TRANSFER_AFTER_JOB_CHANGE",
      likelyService: "Transfer PF",
      relevantAccountFacts: [member.uanMasked, `${member.employments.length} employment records are linked`],
      missingInformation: ["Confirm the current employer record before submission."],
      explanation: "Use Transfer PF to consolidate the previous balance into the current member record. The deterministic preflight will identify any record correction first.",
    };
  }

  if (normalized.includes("medical") || normalized.includes("treatment") || normalized.includes("advance")) {
    return {
      intent: "PF_ADVANCE_MEDICAL",
      likelyService: "PF Advance",
      relevantAccountFacts: [`Available PF balance: ₹${(member.currentPfBalancePaise / 100).toLocaleString("en-IN")}`],
      missingInformation: ["Requested amount"],
      explanation: "A medical PF advance may fit this goal. The Form 31 policy engine will calculate eligibility and the maximum amount using deterministic synthetic rules.",
    };
  }

  return {
    intent: "ACCOUNT_GUIDANCE",
    likelyService: "Online Services",
    relevantAccountFacts: [member.uanMasked],
    missingInformation: ["Tell us whether your goal is a claim, transfer, contribution question, or account update."],
    explanation: "Choose the goal closest to what you need. EPFO One will route you to the appropriate deterministic preflight.",
  };
}
