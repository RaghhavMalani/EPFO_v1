import type { ClaimState } from "@/domain/schemas";

export type ClaimStepContent = {
  label: string;
  responsibleParty: string;
  happening: string;
  citizenAction: string;
  next: string;
};

export const CLAIM_STEP_CONTENT: Record<ClaimState, ClaimStepContent> = {
  DRAFT: {
    label: "Claim preparation",
    responsibleParty: "Aarav Sharma",
    happening: "Your final PF settlement request is being prepared.",
    citizenAction: "Resolve the items found in Claim Preflight.",
    next: "The claim becomes ready after every blocking check passes.",
  },
  READY: {
    label: "Ready for review",
    responsibleParty: "Aarav Sharma",
    happening: "Every readiness check has passed.",
    citizenAction: "Review the amount and confirm submission.",
    next: "The claim will be submitted to EPFO for processing.",
  },
  SUBMITTED: {
    label: "Claim submitted",
    responsibleParty: "EPFO Processing · Simulation",
    happening: "Your claim has entered the EPFO processing queue.",
    citizenAction: "Nothing required.",
    next: "Eligibility will be verified against your record.",
  },
  ELIGIBILITY_VERIFIED: {
    label: "Eligibility verified",
    responsibleParty: "EPFO Processing · Simulation",
    happening: "The final-settlement rules have passed against your record.",
    citizenAction: "Nothing required.",
    next: "Your employment records will be verified.",
  },
  RECORDS_VERIFIED: {
    label: "Records verified",
    responsibleParty: "EPFO Processing · Simulation",
    happening: "Your corrected employment records have been checked.",
    citizenAction: "Nothing required.",
    next: "The claim will move to final approval.",
  },
  APPROVED: {
    label: "Claim approved",
    responsibleParty: "EPFO Processing · Simulation",
    happening: "Your claim has cleared final approval.",
    citizenAction: "Nothing required.",
    next: "A payment instruction will be generated.",
  },
  PAYMENT_INSTRUCTION_CREATED: {
    label: "Payment instruction created",
    responsibleParty: "EPFO Payments · Simulation",
    happening: "An instruction for ₹3,20,400 has been raised against your verified bank account.",
    citizenAction: "Nothing required.",
    next: "The instruction goes to your bank next.",
  },
  BANK_PROCESSING: {
    label: "Bank processing",
    responsibleParty: "Demo Bank · Simulation",
    happening: "Your bank is processing the payment instruction.",
    citizenAction: "Nothing required.",
    next: "This timeline will confirm once the credit lands.",
  },
  CREDITED: {
    label: "Payment credited",
    responsibleParty: "Demo Bank · Simulation",
    happening: "₹3,20,400 has been credited to your verified bank account.",
    citizenAction: "Nothing required. Your settlement is complete.",
    next: "No further processing steps remain.",
  },
};
