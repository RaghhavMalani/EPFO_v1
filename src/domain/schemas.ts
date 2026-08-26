import { z } from "zod";

export const VerificationStatusSchema = z.enum(["VERIFIED", "MISSING"]);
export const TransferStatusSchema = z.enum(["NOT_TRANSFERRED", "TRANSFERRED"]);

export const EmploymentRecordSchema = z.object({
  id: z.string(),
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
});

export const MemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  currentPfBalancePaise: z.number().int().positive(),
  requestedWithdrawalPaise: z.number().int().positive(),
  identity: z.object({
    aadhaarStatus: VerificationStatusSchema,
    panStatus: VerificationStatusSchema,
    bankStatus: VerificationStatusSchema,
  }),
  employments: z.array(EmploymentRecordSchema).min(1),
});

export const PreflightCheckIdSchema = z.enum([
  "IDENTITY_VERIFIED",
  "PAN_VERIFIED",
  "BANK_VERIFIED",
  "WITHDRAWAL_ELIGIBILITY",
  "PREVIOUS_EMPLOYMENT_EXIT_RECORDED",
  "OLD_BALANCE_TRANSFERRED",
  "REQUIRED_INFORMATION_COMPLETE",
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

export const IssueStatusSchema = z.enum([
  "OPEN",
  "ACTION_REQUIRED",
  "WAITING_EXTERNAL",
  "RESOLVED",
  "ESCALATED",
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
  type: z.enum(["MISSING_EXIT_DATE", "OLD_BALANCE_NOT_TRANSFERRED"]),
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
  aggregateType: z.enum(["MEMBER", "ISSUE", "EMPLOYMENT_RECORD", "CLAIM", "PAYMENT"]),
  aggregateId: z.string(),
  eventType: z.string(),
  timestamp: z.string(),
  actorType: z.enum(["CITIZEN", "SYSTEM", "EMPLOYER", "PROCESSOR", "BANK"]),
  actorName: z.string(),
  metadata: z.record(z.string(), AuditMetadataValueSchema),
});

export const AppStateSchema = z.object({
  member: MemberSchema,
  issues: z.array(IssueSchema),
  claim: ClaimSchema,
  auditEvents: z.array(AuditEventSchema),
});

export type EmploymentRecord = z.infer<typeof EmploymentRecordSchema>;
export type Member = z.infer<typeof MemberSchema>;
export type PreflightCheckId = z.infer<typeof PreflightCheckIdSchema>;
export type PreflightCheck = z.infer<typeof PreflightCheckSchema>;
export type IssueStatus = z.infer<typeof IssueStatusSchema>;
export type Issue = z.infer<typeof IssueSchema>;
export type ClaimState = z.infer<typeof ClaimStateSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type ActorType = z.infer<typeof ClaimStateEntrySchema>["actorType"];
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type AuditMetadata = z.infer<typeof AuditEventSchema>["metadata"];
export type AppState = z.infer<typeof AppStateSchema>;
