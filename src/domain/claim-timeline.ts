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
    happening: "Your synthetic final PF settlement request is being prepared.",
    citizenAction: "Resolve the items found in Claim Preflight.",
    next: "The claim becomes ready after every blocking check passes.",
  },
  READY: {
    label: "Ready for review",
    responsibleParty: "Aarav Sharma",
    happening: "Every deterministic preflight check has passed.",
    citizenAction: "Review the amount and confirm submission.",
    next: "The claim will be submitted to simulated processing.",
  },
  SUBMITTED: {
    label: "Claim submitted",
    responsibleParty: "EPFO Processing · Simulation",
    happening: "Your confirmed synthetic claim has entered the processing queue.",
    citizenAction: "Nothing required.",
    next: "Deterministic eligibility checks will be recorded.",
  },
  ELIGIBILITY_VERIFIED: {
    label: "Eligibility verified",
    responsibleParty: "EPFO Processing · Simulation",
    happening: "The deterministic final-settlement rules have passed for this synthetic claim.",
    citizenAction: "Nothing required.",
    next: "Your employment records will be verified.",
  },
  RECORDS_VERIFIED: {
    label: "Records verified",
    responsibleParty: "EPFO Processing · Simulation",
    happening: "Your corrected synthetic employment records have been checked.",
    citizenAction: "Nothing required.",
    next: "The claim will move to final approval.",
  },
  APPROVED: {
    label: "Claim approved",
    responsibleParty: "EPFO Processing · Simulation",
    happening: "Your validated synthetic claim has completed final processing.",
    citizenAction: "Nothing required.",
    next: "A simulated payment instruction will be generated.",
  },
  PAYMENT_INSTRUCTION_CREATED: {
    label: "Payment instruction created",
    responsibleParty: "EPFO Payments · Simulation",
    happening: "A mock instruction for ₹3,20,400 has been created for the verified destination.",
    citizenAction: "Nothing required.",
    next: "The instruction will be sent to the simulated bank.",
  },
  BANK_PROCESSING: {
    label: "Bank processing",
    responsibleParty: "Demo Bank · Simulation",
    happening: "The simulated bank is processing the payment instruction.",
    citizenAction: "Nothing required.",
    next: "The timeline will confirm when the mock credit is complete.",
  },
  CREDITED: {
    label: "Payment credited",
    responsibleParty: "Demo Bank · Simulation",
    happening: "₹3,20,400 has been credited to the synthetic verified destination.",
    citizenAction: "No action required. This demo journey is complete.",
    next: "No further processing steps remain.",
  },
};
