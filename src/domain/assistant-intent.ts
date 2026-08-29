import { z } from "zod";
import type { AssistantResponse, Contribution } from "@/domain/experience-v2";
import type { Member } from "@/domain/schemas";

/**
 * What the language model is allowed to decide.
 *
 * It picks one of these and writes the prose. It does not calculate eligibility, an
 * amount, a readiness score, or a workflow transition — those come from the engines
 * below, against real state. So the worst a wrong classification can do is open the
 * wrong (real) service; it can never quote a number that is not true of this account.
 */
export const ASSISTANT_INTENTS = [
  "UNDERSTAND_CONTRIBUTION",
  "FINAL_SETTLEMENT",
  "PF_ADVANCE",
  "TRANSFER_AFTER_JOB_CHANGE",
  "PENSION_ESTIMATE",
  "CLAIM_STATUS",
  "UPDATE_ACCOUNT_DETAILS",
  "ACCOUNT_GUIDANCE",
] as const;

export const AssistantIntentSchema = z.enum(ASSISTANT_INTENTS);
export type AssistantIntent = z.infer<typeof AssistantIntentSchema>;

/** The only shape a model reply is accepted in. Anything else falls back. */
export const ModelIntentSchema = z.object({
  intent: AssistantIntentSchema,
  explanation: z.string().trim().min(1).max(600),
  missingInformation: z.array(z.string().trim().min(1).max(160)).max(4).default([]),
});
export type ModelIntent = z.infer<typeof ModelIntentSchema>;

const INTENT_SERVICE: Record<AssistantIntent, { service: string; label: string; href: string }> = {
  UNDERSTAND_CONTRIBUTION: { service: "Passbook", label: "Open your passbook", href: "/passbook" },
  FINAL_SETTLEMENT: { service: "Final PF settlement", label: "Check settlement readiness", href: "/withdraw" },
  PF_ADVANCE: { service: "PF advance", label: "Start a PF advance", href: "/advance" },
  TRANSFER_AFTER_JOB_CHANGE: { service: "Transfer PF", label: "Review transfer readiness", href: "/transfer" },
  PENSION_ESTIMATE: { service: "Pension", label: "See your pension estimate", href: "/pension" },
  CLAIM_STATUS: { service: "Claim centre", label: "Track your claims", href: "/claims" },
  UPDATE_ACCOUNT_DETAILS: { service: "Manage", label: "Manage your records", href: "/manage" },
  ACCOUNT_GUIDANCE: { service: "Online Services", label: "Browse PF services", href: "/online-services" },
};

function rupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

/**
 * The account facts shown under an answer.
 *
 * Always computed here, never written by the model, so every number on screen is a
 * fact about this account rather than a plausible-sounding one.
 */
function factsFor(
  intent: AssistantIntent,
  member: Member,
  contributions: Contribution[],
  readiness: { passedCount: number; totalChecks: number },
): string[] {
  const shortfall = contributions.find(
    (item) => item.postingStatus === "MISSING" || item.postingStatus === "MISMATCH",
  );
  const unconsolidated = member.employments.filter(
    (record) =>
      !record.isCurrent && record.transferStatus === "NOT_TRANSFERRED" && record.pfBalancePaise > 0,
  );

  switch (intent) {
    case "UNDERSTAND_CONTRIBUTION":
      return shortfall
        ? [
            `${shortfall.month}: employer EPF recorded ${rupees(shortfall.employerEpfContributionPaise)}`,
            `Status: ${shortfall.postingStatus.toLowerCase()}`,
            `Responsible employer: ${shortfall.employerName}`,
          ]
        : ["Every recorded month matches the expected wage-based contribution."];
    case "FINAL_SETTLEMENT":
      return [
        `Readiness: ${readiness.passedCount} of ${readiness.totalChecks} checks`,
        `Balance available: ${rupees(member.currentPfBalancePaise)}`,
      ];
    case "PF_ADVANCE":
      return [`Balance available to draw against: ${rupees(member.currentPfBalancePaise)}`];
    case "TRANSFER_AFTER_JOB_CHANGE":
      return unconsolidated.length > 0
        ? unconsolidated.map(
            (record) => `${record.employerName}: ${rupees(record.pfBalancePaise)} not yet consolidated`,
          )
        : ["Every previous PF account is already consolidated under this UAN."];
    case "PENSION_ESTIMATE":
      return [`Current PF balance: ${rupees(member.currentPfBalancePaise)}`];
    case "CLAIM_STATUS":
    case "UPDATE_ACCOUNT_DETAILS":
    case "ACCOUNT_GUIDANCE":
      return [member.uanMasked, `${member.employments.length} employment records linked`];
  }
}

/**
 * Turns a classified intent into the answer shown on screen.
 *
 * This is the whole safety property: whether the intent came from the model or the
 * keyword fallback, the service, the facts, and the next step are all resolved here
 * against real state. The model contributes a label and prose, nothing more.
 */
export function resolveAssistantResponse(
  classified: ModelIntent,
  source: AssistantResponse["source"],
  member: Member,
  contributions: Contribution[],
  readiness: { passedCount: number; totalChecks: number },
): AssistantResponse {
  const route = INTENT_SERVICE[classified.intent];
  return {
    intent: classified.intent,
    likelyService: route.service,
    relevantAccountFacts: factsFor(classified.intent, member, contributions, readiness),
    missingInformation: classified.missingInformation,
    explanation: classified.explanation,
    suggestedNextStep: { label: route.label, href: route.href },
    source,
  };
}

const KEYWORD_RULES: { intent: AssistantIntent; patterns: RegExp; explanation: string }[] = [
  {
    intent: "TRANSFER_AFTER_JOB_CHANGE",
    patterns: /transfer|changed (job|compan|employer)|switched (job|compan)|change ki|old (compan|employer|balance|account|pf)|previous (employer|account|pf)|consolidat|purana|पुरान|ट्रांसफर/i,
    explanation:
      "This looks like a previous PF account that was never consolidated. Transfer readiness shows whether anything has to be corrected before the balances can be merged.",
  },
  {
    intent: "PF_ADVANCE",
    patterns: /advance|medical|treatment|illness|marriage|wedding|education|housing|इलाज|शादी/i,
    explanation:
      "This looks like a partial withdrawal for a specific purpose. The Form 31 policy engine decides whether the purpose qualifies and what the maximum amount is.",
  },
  {
    intent: "PENSION_ESTIMATE",
    patterns: /pension|retire|\beps\b|age 58|पेंशन/i,
    explanation:
      "This looks like a question about pension. Your projection estimates the monthly EPS pension and the corpus your balance grows into by age 58.",
  },
  {
    intent: "UNDERSTAND_CONTRIBUTION",
    patterns: /contribution|passbook|deposit|lower|less|missing|short|march|कम|योगदान/i,
    explanation:
      "This looks like a question about a monthly contribution. Your passbook checks every month against what your recorded wages should have produced, and shows the exact difference where there is one.",
  },
  {
    intent: "FINAL_SETTLEMENT",
    patterns: /withdraw|settle|left my job|quit|resign|final|my pf|निकाल|नौकरी छोड/i,
    explanation:
      "This looks like a final settlement. Seven readiness checks run first, so anything that would block the claim is found and routed to whoever can fix it before you file.",
  },
  {
    intent: "UPDATE_ACCOUNT_DETAILS",
    patterns: /update|change my|correct|nominee|nomination|bank account|exit date|aadhaar|pan\b/i,
    explanation:
      "This looks like a record correction. Manage shows which details you can change yourself and which need your employer to approve.",
  },
  {
    intent: "CLAIM_STATUS",
    patterns: /status|where is|how long|track|my claim|कहां|स्थिति/i,
    explanation:
      "This looks like a question about a claim already in flight. The claim centre shows the current stage, who owns it, and what happens next.",
  },
];

/**
 * The fallback classifier.
 *
 * Used when no model is configured, when the call fails, and when a reply does not
 * validate. It is intentionally simple: its job is to keep the assistant answering
 * during a live demo on venue wifi, not to be clever. Rules are ordered most specific
 * first, because several of these questions legitimately match more than one.
 */
export function classifyByKeyword(question: string): ModelIntent {
  const matched = KEYWORD_RULES.find((rule) => rule.patterns.test(question));
  if (matched) {
    return { intent: matched.intent, explanation: matched.explanation, missingInformation: [] };
  }
  return {
    intent: "ACCOUNT_GUIDANCE",
    explanation:
      "Tell us what you are trying to do — understand a contribution, withdraw your PF, move a previous account, or correct a record — and EPFO One will route you to the right service and check it before you file anything.",
    missingInformation: [
      "Whether this is about a claim, a transfer, a contribution, or an account update.",
    ],
  };
}
