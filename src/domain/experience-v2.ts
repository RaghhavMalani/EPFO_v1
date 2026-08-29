import { z } from "zod";

export const ContributionStatusSchema = z.enum([
  "POSTED",
  "DELAYED",
  "MISMATCH",
  "MISSING",
  "RECONCILED",
]);

export const ContributionSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  employmentId: z.string(),
  employerId: z.string(),
  employerName: z.string(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  employeeContributionPaise: z.number().int().nonnegative(),
  employerEpfContributionPaise: z.number().int().nonnegative(),
  epsContributionPaise: z.number().int().nonnegative(),
  wageBasisPaise: z.number().int().nonnegative(),
  postingStatus: ContributionStatusSchema,
  postedAt: z.string().nullable(),
  sourceEcrId: z.string().nullable(),
  explanation: z.string(),
});

export const MemberActivitySchema = z.object({
  id: z.string(),
  type: z.enum([
    "CONTRIBUTION_POSTED",
    "CLAIM_UPDATED",
    "TRANSFER_UPDATED",
    "EMPLOYER_APPROVAL",
    "ACCOUNT_ATTENTION",
  ]),
  title: z.string(),
  detail: z.string(),
  timestamp: z.string(),
  amountPaise: z.number().int().nullable(),
  href: z.string(),
});

export const EligibilityCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(["PASS", "BLOCK"]),
  explanation: z.string(),
});

export const AdvanceGoalSchema = z.enum([
  "MEDICAL",
  "MARRIAGE",
  "EDUCATION",
  "HOUSING",
]);

export const AdvanceStateSchema = z.enum([
  "DRAFT",
  "READY",
  "SUBMITTED",
  "EPFO_PROCESSING",
  "CREDITED",
  "NOT_ELIGIBLE",
]);

export const AdvanceApplicationSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  goal: AdvanceGoalSchema,
  requestedAmountPaise: z.number().int().nonnegative(),
  maximumEligibleAmountPaise: z.number().int().nonnegative(),
  eligible: z.boolean(),
  ruleExplanation: z.string(),
  checks: z.array(EligibilityCheckSchema),
  blockingChecks: z.array(z.string()),
  recommendedNextAction: z.string(),
  state: AdvanceStateSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const TransferStateSchema = z.enum([
  "DRAFT",
  "READY",
  "SUBMITTED",
  "PREVIOUS_RECORD_VERIFIED",
  "CURRENT_RECORD_VERIFIED",
  "EPFO_PROCESSING",
  "BALANCE_MOVED",
  "COMPLETED",
]);

export const TransferApplicationSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  previousEmploymentId: z.string(),
  currentEmploymentId: z.string(),
  amountPaise: z.number().int().nonnegative(),
  state: TransferStateSchema,
  checks: z.array(EligibilityCheckSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  submittedAt: z.string().nullable(),
});

export const EcrIssueCodeSchema = z.enum([
  "DUPLICATE_EMPLOYEE",
  "MISSING_UAN",
  "EMPLOYMENT_RECORD_MISMATCH",
  "UNEXPECTED_CONTRIBUTION",
  "MISSING_REQUIRED_FIELD",
]);

export const EcrIssueSchema = z.object({
  code: EcrIssueCodeSchema,
  field: z.string(),
  message: z.string(),
  expectedPaise: z.number().int().nullable(),
});

export const EcrRowSchema = z.object({
  id: z.string(),
  employee: z.string(),
  memberId: z.string().nullable(),
  uanMasked: z.string(),
  wagePaise: z.number().int().nonnegative(),
  employeeContributionPaise: z.number().int().nonnegative(),
  employerContributionPaise: z.number().int().nonnegative(),
  epsContributionPaise: z.number().int().nonnegative(),
  status: z.enum(["READY", "ISSUE", "EXCLUDED"]),
  issues: z.array(EcrIssueSchema),
});

export const EcrStateSchema = z.enum([
  "DRAFT",
  "NEEDS_CORRECTION",
  "READY",
  "CHALLAN_GENERATED",
  "PAYMENT_COMPLETED",
]);

export const EcrSubmissionSchema = z.object({
  id: z.string(),
  employerId: z.string(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  filename: z.string(),
  state: EcrStateSchema,
  rows: z.array(EcrRowSchema),
  totalContributionPaise: z.number().int().nonnegative(),
  challanId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PastClaimSchema = z.object({
  id: z.string(),
  type: z.enum(["FORM_19", "FORM_31"]),
  label: z.string(),
  amountPaise: z.number().int().positive(),
  submittedAt: z.string(),
  completedAt: z.string(),
  state: z.literal("CREDITED"),
});

export const AssistantResponseSchema = z.object({
  intent: z.string(),
  likelyService: z.string(),
  relevantAccountFacts: z.array(z.string()),
  missingInformation: z.array(z.string()),
  explanation: z.string(),
});

export const ExperienceV2StateSchema = z.object({
  contributions: z.array(ContributionSchema),
  memberActivities: z.array(MemberActivitySchema),
  advance: AdvanceApplicationSchema,
  transfer: TransferApplicationSchema,
  ecrs: z.array(EcrSubmissionSchema),
  pastClaims: z.array(PastClaimSchema),
});

export type ContributionStatus = z.infer<typeof ContributionStatusSchema>;
export type Contribution = z.infer<typeof ContributionSchema>;
export type EligibilityCheck = z.infer<typeof EligibilityCheckSchema>;
export type AdvanceGoal = z.infer<typeof AdvanceGoalSchema>;
export type AdvanceState = z.infer<typeof AdvanceStateSchema>;
export type AdvanceApplication = z.infer<typeof AdvanceApplicationSchema>;
export type TransferState = z.infer<typeof TransferStateSchema>;
export type TransferApplication = z.infer<typeof TransferApplicationSchema>;
export type EcrIssueCode = z.infer<typeof EcrIssueCodeSchema>;
export type EcrRow = z.infer<typeof EcrRowSchema>;
export type EcrState = z.infer<typeof EcrStateSchema>;
export type EcrSubmission = z.infer<typeof EcrSubmissionSchema>;
export type AssistantResponse = z.infer<typeof AssistantResponseSchema>;
export type ExperienceV2State = z.infer<typeof ExperienceV2StateSchema>;
