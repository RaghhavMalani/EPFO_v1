import { z } from "zod";
import { ExperienceV2StateSchema } from "@/domain/experience-v2";

export const VerificationStatusSchema = z.enum(["VERIFIED", "MISSING"]);
export const TransferStatusSchema = z.enum(["NOT_TRANSFERRED", "TRANSFERRED"]);

export const EmploymentRecordSchema = z.object({
  id: z.string(),
  memberRecordLabel: z.string(),
  employerName: z.string(),
  employmentStart: z.string(),
  employmentEnd: z.string().nullable(),
  isCurrent: z.boolean(),
  pfRecordStatus: z.enum(["ACTIVE", "CLOSED"]),
  exitStatus: VerificationStatusSchema,
  pfRecordExitDate: z.string().nullable(),
  pfBalancePaise: z.number().int().nonnegative(),
  transferredAmountPaise: z.number().int().nonnegative(),
  transferStatus: TransferStatusSchema,
  legacyRecordStatus: z.enum(["ALIGNED", "REVIEW_REQUIRED"]),
  serviceEndReason: z.enum(["RESIGNATION", "RETIREMENT"]).nullable(),
});

export const NomineeSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  relationship: z.string().min(1),
  sharePercentage: z.number().int().min(1).max(100),
  dateOfBirth: z.string().nullable(),
});

export const NominationStatusSchema = z.enum(["NOT_STARTED", "SAVED"]);

export const NominationSchema = z.object({
  status: NominationStatusSchema,
  nominees: z.array(NomineeSchema),
  updatedAt: z.string().nullable(),
});

export const MemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  uanMasked: z.string(),
  // A fully drawn-down synthetic account is legitimate, so zero is allowed.
  currentPfBalancePaise: z.number().int().nonnegative(),
  requestedWithdrawalPaise: z.number().int().positive(),
  employmentStatus: z.literal("NOT_EMPLOYED_IN_PF_ESTABLISHMENT"),
  identity: z.object({
    identityStatus: VerificationStatusSchema,
    aadhaarStatus: VerificationStatusSchema,
    panStatus: VerificationStatusSchema,
    bankStatus: VerificationStatusSchema,
    mobileStatus: VerificationStatusSchema,
  }),
  policy: z.object({
    daysSinceLastExit: z.number().int().nonnegative(),
    markExitWaitingPeriodDays: z.number().int().positive(),
    uanAadhaarValidated: z.boolean(),
    uanIssuedBeforeProfileCutoff: z.boolean(),
  }),
  employments: z.array(EmploymentRecordSchema).min(1),
  nomination: NominationSchema,
});

export const PreflightCheckIdSchema = z.enum([
  "IDENTITY_VERIFIED",
  "AADHAAR_LINKED",
  "PAN_VERIFIED",
  "MOBILE_VERIFIED",
  "BANK_VERIFIED",
  "EXIT_DATE_RECORDED",
  "LEGACY_RECORD_ALIGNED",
]);

export const PreflightCheckSchema = z.object({
  id: PreflightCheckIdSchema,
  label: z.string(),
  status: z.enum(["PASS", "WARNING", "BLOCK"]),
  reason: z.string(),
  userExplanation: z.string(),
  responsibleParty: z.string(),
  recommendedAction: z.string(),
  issueId: z.string().optional(),
});

export const ResolutionTypeSchema = z.enum([
  "SELF_SERVICE",
  "EMPLOYER_ACTION",
  "EPFO_ACTION",
  "AUTO_RESOLUTION",
]);

export const IssueStatusSchema = z.enum([
  "OPEN",
  "ACTION_REQUIRED",
  "WAITING_EXTERNAL",
  "RESOLVED",
  "ESCALATED",
]);

export const IssueTypeSchema = z.enum([
  "MISSING_EXIT_DATE",
  "LEGACY_EMPLOYMENT_EXCEPTION",
  "BANK_NOT_READY",
  "PROFILE_CORRECTION",
]);

export const IssueEventSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  status: IssueStatusSchema,
  actorName: z.string(),
  note: z.string(),
});

export const IssueSchema = z.object({
  id: z.string(),
  type: IssueTypeSchema,
  relatedEmploymentId: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  whyItMatters: z.string(),
  responsibleParty: z.string(),
  userAction: z.string(),
  status: IssueStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  expectedBy: z.string(),
  events: z.array(IssueEventSchema),
});

export const EmployerRequestStatusSchema = z.enum([
  "AWAITING_REVIEW",
  "IN_REVIEW",
  "INFORMATION_REQUESTED",
  "APPROVED",
  "REJECTED",
]);

export const EmployerRequestEventSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  status: EmployerRequestStatusSchema,
  actorName: z.string(),
  note: z.string(),
});

export const EmployerRequestSchema = z.object({
  id: z.string(),
  issueId: z.string().nullable(),
  memberId: z.string(),
  memberName: z.string(),
  requestType: z.enum(["LEGACY_RECORD_CORRECTION", "EMPLOYMENT_RECORD_CORRECTION"]),
  title: z.string(),
  currentRecord: z.record(z.string(), z.string()),
  proposedRecord: z.record(z.string(), z.string()),
  whyItMatters: z.string(),
  relatedJourney: z.string(),
  submittedAt: z.string(),
  updatedAt: z.string(),
  status: EmployerRequestStatusSchema,
  supportingContext: z.array(z.string()),
  reason: z.string().nullable(),
  events: z.array(EmployerRequestEventSchema),
});

export const EmployerSchema = z.object({
  id: z.string(),
  name: z.string(),
  establishmentIdMasked: z.string(),
  pfOffice: z.string(),
});

export const ClaimStateSchema = z.enum([
  "DRAFT",
  "READY",
  "SUBMITTED",
  "ELIGIBILITY_VERIFIED",
  "RECORDS_VERIFIED",
  "APPROVED",
  "PAYMENT_INSTRUCTION_CREATED",
  "BANK_PROCESSING",
  "CREDITED",
]);

export const ClaimStateEntrySchema = z.object({
  state: ClaimStateSchema,
  timestamp: z.string(),
  actorType: z.enum(["CITIZEN", "SYSTEM", "EMPLOYER", "PROCESSOR", "BANK"]),
  actorName: z.string(),
});

export const ClaimSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  requestedAmountPaise: z.number().int().positive(),
  serviceType: z.literal("FINAL_PF_SETTLEMENT"),
  formReference: z.literal("FORM_19"),
  state: ClaimStateSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  stateHistory: z.array(ClaimStateEntrySchema),
});

export const AuditMetadataValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const AuditEventSchema = z.object({
  id: z.string(),
  aggregateType: z.enum([
    "MEMBER",
    "ISSUE",
    "EMPLOYMENT_RECORD",
    "EMPLOYER_REQUEST",
    "CLAIM",
    "PAYMENT",
    "CONTRIBUTION",
    "ADVANCE",
    "TRANSFER",
    "ECR",
    "NOMINATION",
  ]),
  aggregateId: z.string(),
  eventType: z.string(),
  timestamp: z.string(),
  actorType: z.enum(["CITIZEN", "SYSTEM", "EMPLOYER", "PROCESSOR", "BANK"]),
  actorName: z.string(),
  metadata: z.record(z.string(), AuditMetadataValueSchema),
});

export const AppStateSchema = z.object({
  member: MemberSchema,
  employer: EmployerSchema,
  issues: z.array(IssueSchema),
  employerRequests: z.array(EmployerRequestSchema),
  claim: ClaimSchema,
  auditEvents: z.array(AuditEventSchema),
  experience: ExperienceV2StateSchema,
});

export type EmploymentRecord = z.infer<typeof EmploymentRecordSchema>;
export type Nominee = z.infer<typeof NomineeSchema>;
export type NominationStatus = z.infer<typeof NominationStatusSchema>;
export type Nomination = z.infer<typeof NominationSchema>;
export type Member = z.infer<typeof MemberSchema>;
export type PreflightCheckId = z.infer<typeof PreflightCheckIdSchema>;
export type PreflightCheck = z.infer<typeof PreflightCheckSchema>;
export type ResolutionType = z.infer<typeof ResolutionTypeSchema>;
export type IssueStatus = z.infer<typeof IssueStatusSchema>;
export type IssueType = z.infer<typeof IssueTypeSchema>;
export type Issue = z.infer<typeof IssueSchema>;
export type EmployerRequestStatus = z.infer<typeof EmployerRequestStatusSchema>;
export type EmployerRequest = z.infer<typeof EmployerRequestSchema>;
export type ClaimState = z.infer<typeof ClaimStateSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type ActorType = z.infer<typeof ClaimStateEntrySchema>["actorType"];
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type AuditMetadata = z.infer<typeof AuditEventSchema>["metadata"];
export type AppState = z.infer<typeof AppStateSchema>;
