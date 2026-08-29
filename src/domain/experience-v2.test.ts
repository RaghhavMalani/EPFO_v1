import { beforeEach, describe, expect, it } from "vitest";
import { ExperienceV2ApplicationService } from "@/application/experience-v2-service";
import { ADVANCE_SEQUENCE, nextAdvanceState, transitionAdvance } from "@/domain/advance-machine";
import { buildMemberActivity } from "@/domain/activity-feed";
import { completedServiceMonths, evaluateAdvancePolicy } from "@/domain/advance-policy";
import {
  contributionStatusLabel,
  evaluateContributionHealth,
  expectedContributionFromWage,
  selectPassbookHighlights,
  summarisePassbook,
} from "@/domain/contribution-health";
import {
  calculateEcrTotal,
  correctEcrRow,
  countEcrIssues,
  ecrRowsAreClear,
  parseSyntheticPayroll,
  validateEcrRows,
  type MemberDirectory,
  type RawSyntheticPayrollRow,
} from "@/domain/ecr-engine";
import { canTransitionEcr, deriveEcrValidationState, transitionEcr } from "@/domain/ecr-machine";
import type {
  AdvanceApplication,
  Contribution,
  EcrRow,
  EcrSubmission,
  TransferApplication,
} from "@/domain/experience-v2";
import { TRANSFER_SEQUENCE, nextTransferState, transitionTransfer } from "@/domain/transfer-machine";
import type { AppState, Member } from "@/domain/schemas";
import { createSyntheticScenario } from "@/fixtures/synthetic-scenario";
import { WAGE_BASIS_PAISE } from "@/fixtures/experience-v2-scenario";
import { InMemoryEpfoRepository } from "@/repositories/in-memory-epfo-repository";

const NOW = "2026-08-29T05:00:00.000Z";
const ECR_ID = "ecr-2026-08";
const SOURCE_EMPLOYMENT_ID = "employment-demo-logistics";
const TARGET_EMPLOYMENT_ID = "employment-demo-systems";

/** Row ids carrying the fixture's seeded defects, in file order. */
const DEFECT_ROW_IDS = ["ecr-row-03", "ecr-row-05", "ecr-row-07", "ecr-row-09", "ecr-row-11"];

function scenario(): AppState {
  return createSyntheticScenario();
}

function employment(state: AppState, id: string) {
  const record = state.member.employments.find((item) => item.id === id);
  if (!record) throw new Error(`missing employment ${id}`);
  return record;
}

function contributionFor(overrides: Partial<Contribution> = {}): Contribution {
  const expected = expectedContributionFromWage(WAGE_BASIS_PAISE);
  return {
    id: "contribution-test",
    memberId: "member-aarav",
    employmentId: TARGET_EMPLOYMENT_ID,
    employerId: "employer-demo-systems",
    employerName: "Demo Systems Pvt Ltd",
    month: "2026-01",
    employeeContributionPaise: expected.employeePaise,
    employerEpfContributionPaise: expected.employerPaise,
    epsContributionPaise: expected.epsPaise,
    wageBasisPaise: WAGE_BASIS_PAISE,
    postingStatus: "POSTED",
    postedAt: "2026-01-28T06:30:00.000Z",
    sourceEcrId: null,
    reconciliation: null,
    explanation: "test",
    ...overrides,
  };
}

function payrollRow(overrides: Partial<RawSyntheticPayrollRow> = {}): RawSyntheticPayrollRow {
  const expected = expectedContributionFromWage(WAGE_BASIS_PAISE);
  return {
    id: "row-1",
    employee: "Riya Mehta",
    memberId: "member-payroll-1",
    uanMasked: "DEMO-••••-1800",
    wagePaise: WAGE_BASIS_PAISE,
    employeeContributionPaise: expected.employeePaise,
    employerContributionPaise: expected.employerPaise,
    epsContributionPaise: expected.epsPaise,
    ...overrides,
  };
}

const allLinked = () => true;

function advanceFor(overrides: Partial<AdvanceApplication> = {}): AdvanceApplication {
  return {
    id: "advance-demo-001",
    memberId: "member-aarav",
    goal: "MEDICAL",
    requestedAmountPaise: 1_000_000,
    maximumEligibleAmountPaise: 5_400_000,
    eligible: true,
    ruleExplanation: "test",
    checks: [],
    blockingChecks: [],
    recommendedNextAction: "test",
    state: "READY",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function transferFor(overrides: Partial<TransferApplication> = {}): TransferApplication {
  return {
    id: "transfer-demo-001",
    memberId: "member-aarav",
    previousEmploymentId: SOURCE_EMPLOYMENT_ID,
    currentEmploymentId: TARGET_EMPLOYMENT_ID,
    amountPaise: 4_120_000,
    state: "DRAFT",
    checks: [{ id: "SAME_UAN", label: "Same UAN", status: "PASS", explanation: "ok" }],
    createdAt: NOW,
    updatedAt: NOW,
    submittedAt: null,
    ...overrides,
  };
}

function ecrFor(rows: EcrRow[], overrides: Partial<EcrSubmission> = {}): EcrSubmission {
  return {
    id: ECR_ID,
    employerId: "employer-demo-systems",
    month: "2026-08",
    filename: "test.csv",
    state: deriveEcrValidationState(rows),
    rows,
    totalContributionPaise: calculateEcrTotal(rows),
    challanId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

// ------------------------------------------------------------------ Passbook domain

describe("contribution health engine", () => {
  it("derives the 12 / 12 / 8.33 percent shares from the wage basis", () => {
    expect(expectedContributionFromWage(1_800_000)).toEqual({
      employeePaise: 216_000,
      employerPaise: 216_000,
      epsPaise: 125_000,
    });
  });

  it("caps the EPS share at the synthetic monthly ceiling", () => {
    const low = expectedContributionFromWage(1_000_000);
    const high = expectedContributionFromWage(9_000_000);
    expect(low.epsPaise).toBe(83_300);
    expect(high.epsPaise).toBe(125_000);
  });

  it("reports POSTED when every share matches the wage expectation", () => {
    const health = evaluateContributionHealth(contributionFor());
    expect(health.status).toBe("POSTED");
    expect(health.differences).toEqual([]);
    expect(health.shortfallPaise).toBe(0);
  });

  it("reports MISMATCH and the exact shortfall when the employer share is missing", () => {
    const health = evaluateContributionHealth(
      contributionFor({ employerEpfContributionPaise: 0, postingStatus: "MISMATCH" }),
    );
    expect(health.status).toBe("MISMATCH");
    expect(health.differences).toContain("Employer EPF contribution differs from the wage-based expectation.");
    expect(health.recordedTotalPaise).toBe(341_000);
    expect(health.expectedTotalPaise).toBe(557_000);
    expect(health.shortfallPaise).toBe(216_000);
  });

  it("reports MISSING when nothing was recorded for the month", () => {
    const health = evaluateContributionHealth(
      contributionFor({
        employeeContributionPaise: 0,
        employerEpfContributionPaise: 0,
        epsContributionPaise: 0,
        postingStatus: "MISSING",
        postedAt: null,
      }),
    );
    expect(health.status).toBe("MISSING");
    expect(health.shortfallPaise).toBe(557_000);
  });

  it("keeps DELAYED even when the recorded amounts are complete", () => {
    const health = evaluateContributionHealth(contributionFor({ postingStatus: "DELAYED" }));
    expect(health.status).toBe("DELAYED");
    expect(health.shortfallPaise).toBe(0);
    expect(health.differences[0]).toBe("This month was posted after the expected posting date.");
  });

  it("distinguishes a delayed month that has not been posted at all", () => {
    const health = evaluateContributionHealth(
      contributionFor({ postingStatus: "DELAYED", postedAt: null }),
    );
    expect(health.status).toBe("DELAYED");
    expect(health.differences[0]).toBe("This month has not been posted yet.");
  });

  it("treats RECONCILED as settled with no differences or shortfall", () => {
    const health = evaluateContributionHealth(
      contributionFor({ postingStatus: "RECONCILED", employerEpfContributionPaise: 0 }),
    );
    expect(health.status).toBe("RECONCILED");
    expect(health.differences).toEqual([]);
    expect(health.shortfallPaise).toBe(0);
  });

  it("is deterministic for the same contribution", () => {
    const contribution = contributionFor({ postingStatus: "MISMATCH", employerEpfContributionPaise: 1 });
    expect(evaluateContributionHealth(contribution)).toEqual(evaluateContributionHealth(contribution));
  });
});

describe("passbook summary", () => {
  const summary = () => summarisePassbook(scenario().experience.contributions);

  it("orders months oldest to newest regardless of input order", () => {
    const contributions = scenario().experience.contributions;
    const forward = summarisePassbook(contributions).months.map((m) => m.contribution.month);
    const reversed = summarisePassbook([...contributions].reverse()).months.map((m) => m.contribution.month);
    expect(forward).toEqual(["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"]);
    expect(reversed).toEqual(forward);
  });

  it("totals each share across the synthetic year", () => {
    const result = summary();
    expect(result.totalEmployeeContributionPaise).toBe(1_512_000);
    expect(result.totalEmployerEpfContributionPaise).toBe(1_296_000);
    expect(result.totalEpsContributionPaise).toBe(875_000);
    expect(result.totalContributionPaise).toBe(3_683_000);
  });

  it("counts every posting status and reports only the months needing attention", () => {
    const result = summary();
    expect(result.countsByStatus).toEqual({
      POSTED: 4,
      DELAYED: 1,
      MISMATCH: 1,
      MISSING: 0,
      RECONCILED: 1,
    });
    expect(result.monthsNeedingAttention).toEqual(["2026-03", "2026-06"]);
    expect(result.totalShortfallPaise).toBe(216_000);
  });
});

// -------------------------------------------------------------- Form 31 advance domain

describe("Form 31 advance policy", () => {
  const member = () => scenario().member;

  it("supports all four synthetic purposes with a full deterministic result", () => {
    for (const goal of ["MEDICAL", "MARRIAGE", "EDUCATION", "HOUSING"] as const) {
      const result = evaluateAdvancePolicy({
        member: member(),
        goal,
        latestWageBasisPaise: WAGE_BASIS_PAISE,
        now: NOW,
      });
      expect(result.goal).toBe(goal);
      expect(result.eligible).toBe(true);
      expect(result.state).toBe("READY");
      expect(result.checks).toHaveLength(7);
      expect(result.ruleExplanation.length).toBeGreaterThan(0);
      expect(result.blockingChecks).toEqual([]);
      expect(result.maximumEligibleAmountPaise).toBeGreaterThan(0);
    }
  });

  it("caps a medical advance at three times the wage basis", () => {
    const result = evaluateAdvancePolicy({
      member: member(),
      goal: "MEDICAL",
      latestWageBasisPaise: WAGE_BASIS_PAISE,
      now: NOW,
    });
    expect(result.maximumEligibleAmountPaise).toBe(5_400_000);
  });

  it("falls back to the PF balance when the wage multiple exceeds it", () => {
    const current = member();
    const result = evaluateAdvancePolicy({
      member: current,
      goal: "HOUSING",
      latestWageBasisPaise: WAGE_BASIS_PAISE,
      now: NOW,
    });
    expect(36 * WAGE_BASIS_PAISE).toBeGreaterThan(current.currentPfBalancePaise);
    expect(result.maximumEligibleAmountPaise).toBe(current.currentPfBalancePaise);
  });

  it("clamps a request above the maximum down to the maximum", () => {
    const result = evaluateAdvancePolicy({
      member: member(),
      goal: "MEDICAL",
      latestWageBasisPaise: WAGE_BASIS_PAISE,
      requestedAmountPaise: 99_000_000,
      now: NOW,
    });
    expect(result.requestedAmountPaise).toBe(5_400_000);
  });

  it("blocks and zeroes the maximum when a verification is missing", () => {
    const unverified: Member = {
      ...member(),
      identity: { ...member().identity, bankStatus: "MISSING" },
    };
    const result = evaluateAdvancePolicy({
      member: unverified,
      goal: "MEDICAL",
      latestWageBasisPaise: WAGE_BASIS_PAISE,
      now: NOW,
    });
    expect(result.eligible).toBe(false);
    expect(result.state).toBe("NOT_ELIGIBLE");
    expect(result.blockingChecks).toContain("BANK");
    expect(result.maximumEligibleAmountPaise).toBe(0);
    expect(result.requestedAmountPaise).toBe(0);
  });

  it("blocks a purpose whose minimum service period is not met", () => {
    const base = member();
    const shortService: Member = {
      ...base,
      employments: [{ ...base.employments[0], employmentStart: "2026-01-01", employmentEnd: "2026-06-01" }],
    };
    const marriage = evaluateAdvancePolicy({
      member: shortService,
      goal: "MARRIAGE",
      latestWageBasisPaise: WAGE_BASIS_PAISE,
      now: NOW,
    });
    const medical = evaluateAdvancePolicy({
      member: shortService,
      goal: "MEDICAL",
      latestWageBasisPaise: WAGE_BASIS_PAISE,
      now: NOW,
    });
    expect(marriage.blockingChecks).toContain("SERVICE");
    expect(medical.blockingChecks).toEqual([]);
  });

  it("counts completed service across every employment record", () => {
    expect(completedServiceMonths(member(), NOW)).toBeGreaterThanOrEqual(84);
  });

  it("returns an identical result for identical inputs", () => {
    const input = { member: member(), goal: "EDUCATION" as const, latestWageBasisPaise: WAGE_BASIS_PAISE, now: NOW };
    expect(evaluateAdvancePolicy(input)).toEqual(evaluateAdvancePolicy(input));
  });
});

describe("advance state machine", () => {
  it("walks the full sequence in order", () => {
    let advance = advanceFor({ state: "DRAFT" });
    const seen = [advance.state];
    for (const next of ADVANCE_SEQUENCE.slice(1)) {
      advance = transitionAdvance(advance, next, NOW);
      seen.push(advance.state);
    }
    expect(seen).toEqual(ADVANCE_SEQUENCE);
  });

  it("refuses to skip a state", () => {
    expect(() => transitionAdvance(advanceFor({ state: "READY" }), "CREDITED", NOW)).toThrow(
      "Advance cannot move from READY to CREDITED.",
    );
  });

  it("refuses to move an advance that is not eligible", () => {
    expect(() => transitionAdvance(advanceFor({ state: "NOT_ELIGIBLE", eligible: false }), "READY", NOW)).toThrow(
      "must be re-evaluated",
    );
  });

  it("refuses to set NOT_ELIGIBLE by transition", () => {
    expect(() => transitionAdvance(advanceFor({ state: "DRAFT" }), "NOT_ELIGIBLE", NOW)).toThrow(
      "decided by the policy engine",
    );
  });

  it("refuses to become ready while blocking checks remain", () => {
    expect(() => transitionAdvance(advanceFor({ state: "DRAFT", eligible: false }), "READY", NOW)).toThrow(
      "blocking checks",
    );
  });

  it("refuses to submit an amount above the deterministic maximum", () => {
    expect(() => transitionAdvance(advanceFor({ requestedAmountPaise: 9_000_000 }), "SUBMITTED", NOW)).toThrow(
      "exceeds the deterministic eligible amount",
    );
  });

  it("refuses to submit without a requested amount", () => {
    expect(() => transitionAdvance(advanceFor({ requestedAmountPaise: 0 }), "SUBMITTED", NOW)).toThrow(
      "requested amount is required",
    );
  });

  it("reports no next state once credited", () => {
    expect(nextAdvanceState("CREDITED")).toBeNull();
    expect(nextAdvanceState("NOT_ELIGIBLE")).toBeNull();
  });
});

// ------------------------------------------------------- Form 13 transfer state machine

describe("transfer state machine", () => {
  it("walks all eight states in order", () => {
    let transfer = transferFor();
    const seen = [transfer.state];
    for (const next of TRANSFER_SEQUENCE.slice(1)) {
      transfer = transitionTransfer(transfer, next, NOW);
      seen.push(transfer.state);
    }
    expect(seen).toEqual(TRANSFER_SEQUENCE);
  });

  it("refuses to skip a state", () => {
    expect(() => transitionTransfer(transferFor(), "EPFO_PROCESSING", NOW)).toThrow(
      "Transfer cannot move from DRAFT to EPFO_PROCESSING.",
    );
  });

  it("refuses to become ready while a blocking check remains", () => {
    const blocked = transferFor({
      checks: [{ id: "PREVIOUS_RECORD", label: "Previous record", status: "BLOCK", explanation: "blocked" }],
    });
    expect(() => transitionTransfer(blocked, "READY", NOW)).toThrow("blocking checks remain");
  });

  it("stamps the submission time only when submitted", () => {
    const ready = transitionTransfer(transferFor(), "READY", NOW);
    expect(ready.submittedAt).toBeNull();
    const submitted = transitionTransfer(ready, "SUBMITTED", NOW);
    expect(submitted.submittedAt).toBe(NOW);
  });

  it("reports no next state once complete", () => {
    expect(nextTransferState("COMPLETED")).toBeNull();
    expect(nextTransferState("DRAFT")).toBe("READY");
  });
});

// ------------------------------------------------------------- Employer ECR domain

describe("synthetic payroll parser", () => {
  const header =
    "employee,memberId,uanMasked,wageRupees,employeeContributionRupees,employerContributionRupees,epsContributionRupees";

  it("parses rupee columns into paise", () => {
    const rows = parseSyntheticPayroll(`${header}\nRiya Mehta,member-payroll-1,DEMO-1800,18000,2160,2160,1250`);
    expect(rows).toEqual([
      {
        id: "ecr-row-01",
        employee: "Riya Mehta",
        memberId: "member-payroll-1",
        uanMasked: "DEMO-1800",
        wagePaise: 1_800_000,
        employeeContributionPaise: 216_000,
        employerContributionPaise: 216_000,
        epsContributionPaise: 125_000,
      },
    ]);
  });

  it("keeps blank values so validation can report them as row issues", () => {
    const rows = parseSyntheticPayroll(`${header}\nDev Patel,,,18000,2160,2160,1250`);
    expect(rows[0].memberId).toBeNull();
    expect(rows[0].uanMasked).toBe("");
    expect(validateEcrRows(rows, allLinked)[0].issues.map((i) => i.code)).toEqual(["MISSING_UAN"]);
  });

  it("rejects a file whose header does not match the synthetic format", () => {
    expect(() => parseSyntheticPayroll("name,wage\nRiya,18000")).toThrow("synthetic payroll header");
  });

  it("rejects a line with the wrong number of columns", () => {
    expect(() => parseSyntheticPayroll(`${header}\nRiya Mehta,member-payroll-1`)).toThrow("columns");
  });

  it("rejects an empty file", () => {
    expect(() => parseSyntheticPayroll("   \n  ")).toThrow("empty");
  });
});

describe("ECR validation engine", () => {
  it("accepts a row that satisfies every rule", () => {
    const [row] = validateEcrRows([payrollRow()], allLinked);
    expect(row.status).toBe("READY");
    expect(row.issues).toEqual([]);
  });

  it("flags a missing masked UAN", () => {
    const [row] = validateEcrRows([payrollRow({ uanMasked: "" })], allLinked);
    expect(row.issues.map((issue) => issue.code)).toEqual(["MISSING_UAN"]);
  });

  it("flags a missing required field", () => {
    const [name] = validateEcrRows([payrollRow({ employee: "  " })], allLinked);
    expect(name.issues.map((issue) => issue.code)).toContain("MISSING_REQUIRED_FIELD");
    const [wage] = validateEcrRows(
      [payrollRow({ wagePaise: 0, employeeContributionPaise: 0, employerContributionPaise: 0, epsContributionPaise: 0 })],
      allLinked,
    );
    expect(wage.issues.map((issue) => issue.code)).toEqual(["MISSING_REQUIRED_FIELD"]);
  });

  it("flags an employment record mismatch", () => {
    const [row] = validateEcrRows([payrollRow({ memberId: "member-unlinked" })], () => false);
    expect(row.issues.map((issue) => issue.code)).toEqual(["EMPLOYMENT_RECORD_MISMATCH"]);
  });

  it("flags a contribution that breaks the wage rule and reports the expected value", () => {
    const [row] = validateEcrRows([payrollRow({ employeeContributionPaise: 1 })], allLinked);
    expect(row.issues.map((issue) => issue.code)).toEqual(["UNEXPECTED_CONTRIBUTION"]);
    expect(row.issues[0].expectedPaise).toBe(216_000);
    expect(row.issues[0].field).toBe("employeeContributionPaise");
  });

  it("flags only the later occurrence of a duplicated employee", () => {
    const rows = validateEcrRows(
      [
        payrollRow({ id: "row-1", uanMasked: "DEMO-1" }),
        payrollRow({ id: "row-2", uanMasked: "DEMO-1" }),
        payrollRow({ id: "row-3", uanMasked: "DEMO-2" }),
      ],
      allLinked,
    );
    expect(rows.map((row) => row.status)).toEqual(["READY", "ISSUE", "READY"]);
    expect(rows[1].issues.map((issue) => issue.code)).toEqual(["DUPLICATE_EMPLOYEE"]);
  });

  it("leaves an excluded row untouched and out of the total", () => {
    const rows = validateEcrRows(
      [payrollRow({ id: "row-1" }), { ...payrollRow({ id: "row-2", uanMasked: "" }), status: "EXCLUDED" }],
      allLinked,
    );
    expect(rows[1].status).toBe("EXCLUDED");
    expect(rows[1].issues).toEqual([]);
    expect(calculateEcrTotal(rows)).toBe(557_000);
    expect(ecrRowsAreClear(rows)).toBe(true);
  });

  it("is deterministic across repeated runs", () => {
    const rows = [payrollRow({ id: "row-1" }), payrollRow({ id: "row-2", employeeContributionPaise: 5 })];
    expect(validateEcrRows(rows, allLinked)).toEqual(validateEcrRows(rows, allLinked));
  });
});

describe("ECR row correction", () => {
  const directory: MemberDirectory = new Map([["DEMO-XXXX-4821", "member-aarav"]]);

  it("restores contributions to the deterministic wage expectation", () => {
    const [row] = validateEcrRows([payrollRow({ employeeContributionPaise: 1 })], allLinked);
    const corrected = correctEcrRow(row, directory);
    expect(corrected.status).toBe("READY");
    expect(corrected.employeeContributionPaise).toBe(216_000);
    expect(corrected.issues).toEqual([]);
  });

  it("links a mismatched row to the member that owns the masked UAN", () => {
    const [row] = validateEcrRows(
      [payrollRow({ memberId: "member-aarav-unlinked", uanMasked: "DEMO-XXXX-4821" })],
      (id) => id === "member-aarav",
    );
    expect(row.issues.map((issue) => issue.code)).toEqual(["EMPLOYMENT_RECORD_MISMATCH"]);
    expect(correctEcrRow(row, directory).memberId).toBe("member-aarav");
  });

  it("excludes a duplicate row rather than paying it twice", () => {
    const rows = validateEcrRows(
      [payrollRow({ id: "row-1", uanMasked: "DEMO-1" }), payrollRow({ id: "row-2", uanMasked: "DEMO-1" })],
      allLinked,
    );
    const corrected = correctEcrRow(rows[1], directory);
    expect(corrected.status).toBe("EXCLUDED");
    expect(calculateEcrTotal([rows[0], corrected])).toBe(557_000);
  });

  it("takes an employer-supplied value for a field it cannot derive", () => {
    const [missingUan] = validateEcrRows([payrollRow({ uanMasked: "" })], allLinked);
    expect(correctEcrRow(missingUan, directory, { uanMasked: "DEMO-••••-9001" }).uanMasked).toBe("DEMO-••••-9001");

    const [missingWage] = validateEcrRows(
      [payrollRow({ wagePaise: 0, employeeContributionPaise: 0, employerContributionPaise: 0, epsContributionPaise: 0 })],
      allLinked,
    );
    const corrected = correctEcrRow(missingWage, directory, { wagePaise: 2_000_000 });
    expect(corrected.wagePaise).toBe(2_000_000);
    expect(corrected.employeeContributionPaise).toBe(240_000);
    expect(corrected.status).toBe("READY");
  });
});

describe("ECR state machine", () => {
  const clean = () => validateEcrRows([payrollRow()], allLinked);
  const dirty = () => validateEcrRows([payrollRow({ uanMasked: "" })], allLinked);

  it("derives the validation state from the rows", () => {
    expect(deriveEcrValidationState(clean())).toBe("READY");
    expect(deriveEcrValidationState(dirty())).toBe("VALIDATION_FAILED");
  });

  it("allows only the defined payment progression", () => {
    expect(canTransitionEcr("READY", "CHALLAN_GENERATED")).toBe(true);
    expect(canTransitionEcr("CHALLAN_GENERATED", "PAYMENT_PROCESSING")).toBe(true);
    expect(canTransitionEcr("PAYMENT_PROCESSING", "PAID")).toBe(true);
    expect(canTransitionEcr("READY", "PAID")).toBe(false);
    expect(canTransitionEcr("CHALLAN_GENERATED", "PAID")).toBe(false);
    expect(canTransitionEcr("PAID", "READY")).toBe(false);
  });

  it("refuses to reach a challan from a file that failed validation", () => {
    expect(() => transitionEcr(ecrFor(dirty()), "CHALLAN_GENERATED", NOW)).toThrow(
      "ECR cannot move from VALIDATION_FAILED to CHALLAN_GENERATED.",
    );
  });

  it("refuses a challan even from READY if a row is still in issue", () => {
    const stale = ecrFor(dirty(), { state: "READY" });
    expect(() => transitionEcr(stale, "CHALLAN_GENERATED", NOW)).toThrow("Resolve all ECR issues");
  });

  it("refuses a transition that is not defined", () => {
    expect(() => transitionEcr(ecrFor(clean()), "PAID", NOW)).toThrow(
      "ECR cannot move from READY to PAID.",
    );
  });
});

// ------------------------------------------------------ Application service integration

describe("Experience V2 application service", () => {
  let repository: InMemoryEpfoRepository;
  let service: ExperienceV2ApplicationService;
  let sequence: number;

  beforeEach(() => {
    repository = new InMemoryEpfoRepository();
    sequence = 0;
    service = new ExperienceV2ApplicationService(
      repository,
      () => new Date(NOW),
      (prefix) => `${prefix}-${++sequence}`,
    );
  });

  const auditFor = (aggregateType: string) =>
    repository.getState().auditEvents.filter((event) => event.aggregateType === aggregateType);

  function clearEcr() {
    service.correctEcrRow(ECR_ID, "ecr-row-03");
    service.correctEcrRow(ECR_ID, "ecr-row-05");
    service.correctEcrRow(ECR_ID, "ecr-row-07");
    service.correctEcrRow(ECR_ID, "ecr-row-09", { uanMasked: "DEMO-••••-9001" });
    return service.correctEcrRow(ECR_ID, "ecr-row-11", { wagePaise: 2_000_000 });
  }

  it("seeds a file that fails validation with one issue of each kind", () => {
    const ecr = repository.getState().experience.ecrs[0];
    expect(ecr.state).toBe("VALIDATION_FAILED");
    expect(ecr.rows.filter((row) => row.status === "ISSUE").map((row) => row.id)).toEqual(DEFECT_ROW_IDS);
    expect(new Set(ecr.rows.flatMap((row) => row.issues.map((issue) => issue.code)))).toEqual(
      new Set([
        "UNEXPECTED_CONTRIBUTION",
        "EMPLOYMENT_RECORD_MISMATCH",
        "DUPLICATE_EMPLOYEE",
        "MISSING_UAN",
        "MISSING_REQUIRED_FIELD",
      ]),
    );
  });

  it("reaches READY only once every row is resolved", () => {
    const afterFirst = service.correctEcrRow(ECR_ID, "ecr-row-03");
    expect(afterFirst.state).toBe("VALIDATION_FAILED");
    expect(countEcrIssues(afterFirst.rows)).toBeLessThan(6);
    const cleared = clearEcr();
    expect(cleared.state).toBe("READY");
    expect(countEcrIssues(cleared.rows)).toBe(0);
    expect(cleared.rows.find((row) => row.id === "ecr-row-07")?.status).toBe("EXCLUDED");
  });

  it("refuses a challan while the file still fails validation", () => {
    expect(() => service.generateChallan(ECR_ID)).toThrow("ECR cannot move from VALIDATION_FAILED");
  });

  it("refuses to skip straight from a challan to payment completion", () => {
    clearEcr();
    service.generateChallan(ECR_ID);
    expect(() => service.completeEcrPayment(ECR_ID)).toThrow("ECR cannot move from CHALLAN_GENERATED to PAID.");
  });

  it("posts a member contribution when the employer completes the ECR payment", () => {
    const before = repository.getState();
    clearEcr();
    service.generateChallan(ECR_ID);
    service.startEcrPayment(ECR_ID);
    const paid = service.completeEcrPayment(ECR_ID);
    expect(paid.state).toBe("PAID");

    const after = repository.getState();
    const posted = after.experience.contributions.find((item) => item.month === "2026-08");
    expect(posted).toBeDefined();
    expect(posted?.postingStatus).toBe("POSTED");
    expect(posted?.sourceEcrId).toBe(ECR_ID);
    expect(posted?.employeeContributionPaise).toBe(336_000);
    expect(posted?.employerEpfContributionPaise).toBe(336_000);

    // Only the two EPF shares build the balance; EPS funds the pension component.
    expect(after.member.currentPfBalancePaise).toBe(before.member.currentPfBalancePaise + 672_000);
    expect(employment(after, TARGET_EMPLOYMENT_ID).pfBalancePaise).toBe(
      employment(before, TARGET_EMPLOYMENT_ID).pfBalancePaise + 672_000,
    );
  });

  it("records ECR_PAYMENT_COMPLETED and CONTRIBUTION_POSTED as linked audit events", () => {
    clearEcr();
    service.generateChallan(ECR_ID);
    service.startEcrPayment(ECR_ID);
    service.completeEcrPayment(ECR_ID);

    const payment = auditFor("ECR").find((event) => event.eventType === "ECR_PAYMENT_COMPLETED");
    const contribution = auditFor("CONTRIBUTION").find((event) => event.eventType === "CONTRIBUTION_POSTED");
    expect(payment?.actorType).toBe("EMPLOYER");
    expect(contribution?.actorType).toBe("SYSTEM");
    expect(contribution?.metadata.sourceEcrId).toBe(ECR_ID);
    expect(contribution?.metadata.amountPaise).toBe(672_000);

    const activity = repository.getState().experience.memberActivities.at(-1);
    expect(activity?.type).toBe("CONTRIBUTION_POSTED");
    expect(activity?.amountPaise).toBe(672_000);
  });

  it("does not post the same month twice", () => {
    clearEcr();
    service.generateChallan(ECR_ID);
    service.startEcrPayment(ECR_ID);
    service.completeEcrPayment(ECR_ID);
    const afterFirst = repository.getState();
    expect(() => service.completeEcrPayment(ECR_ID)).toThrow("ECR cannot move from PAID to PAID.");
    expect(repository.getState().experience.contributions).toHaveLength(
      afterFirst.experience.contributions.length,
    );
  });

  it("re-validating a file leaves a deterministic audit trail without changing it", () => {
    const validated = service.validateEcr(ECR_ID);
    expect(validated.state).toBe("VALIDATION_FAILED");
    expect(validated.rows.filter((row) => row.status === "ISSUE").map((row) => row.id)).toEqual(DEFECT_ROW_IDS);
    expect(auditFor("ECR").map((event) => event.eventType)).toEqual(["ECR_VALIDATED"]);
  });

  it("moves the balance between employment records when the transfer completes", () => {
    const before = repository.getState();
    const amountPaise = before.experience.transfer.amountPaise;
    expect(amountPaise).toBe(4_120_000);

    service.resolveTransferBlocker();
    let state = service.advanceTransferToNextState().state;
    while (state !== "COMPLETED") {
      state = service.advanceTransferToNextState().state;
    }

    const after = repository.getState();
    const source = employment(after, SOURCE_EMPLOYMENT_ID);
    expect(source.pfBalancePaise).toBe(0);
    expect(source.transferredAmountPaise).toBe(amountPaise);
    expect(source.transferStatus).toBe("TRANSFERRED");
    expect(employment(after, TARGET_EMPLOYMENT_ID).pfBalancePaise).toBe(
      employment(before, TARGET_EMPLOYMENT_ID).pfBalancePaise + amountPaise,
    );
    expect(after.member.currentPfBalancePaise).toBe(before.member.currentPfBalancePaise + amountPaise);
  });

  it("creates an audit event for every transfer transition", () => {
    service.resolveTransferBlocker();
    let state = service.advanceTransferToNextState().state;
    while (state !== "COMPLETED") {
      state = service.advanceTransferToNextState().state;
    }
    expect(auditFor("TRANSFER").map((event) => event.eventType)).toEqual([
      "TRANSFER_READY",
      "TRANSFER_SUBMITTED",
      "TRANSFER_PREVIOUS_RECORD_VERIFIED",
      "TRANSFER_CURRENT_RECORD_VERIFIED",
      "TRANSFER_EPFO_PROCESSING",
      "TRANSFER_BALANCE_MOVED",
      "TRANSFER_COMPLETED",
    ]);
  });

  it("refuses to submit a transfer while the previous record is still blocked", () => {
    expect(() => service.transitionTransfer("READY")).toThrow("blocking checks remain");
  });

  it("recalculates the advance from the selected purpose and the latest wage basis", () => {
    const medical = service.setAdvanceGoal("MEDICAL");
    expect(medical.maximumEligibleAmountPaise).toBe(3 * WAGE_BASIS_PAISE);
    const housing = service.setAdvanceGoal("HOUSING");
    expect(housing.maximumEligibleAmountPaise).toBe(repository.getState().member.currentPfBalancePaise);
    expect(auditFor("ADVANCE").map((event) => event.eventType)).toEqual([
      "ADVANCE_PREFLIGHT_COMPLETED",
      "ADVANCE_PREFLIGHT_COMPLETED",
    ]);
  });

  it("uses the newly posted month as the wage basis after an ECR payment", () => {
    clearEcr();
    service.generateChallan(ECR_ID);
    service.startEcrPayment(ECR_ID);
    service.completeEcrPayment(ECR_ID);
    expect(service.setAdvanceGoal("MEDICAL").maximumEligibleAmountPaise).toBe(3 * 2_800_000);
  });

  it("carries an advance through to a credited past claim", () => {
    service.setAdvanceGoal("MEDICAL");
    const submitted = service.submitAdvance(1_000_000);
    expect(submitted.state).toBe("SUBMITTED");
    const before = repository.getState().member.currentPfBalancePaise;

    expect(service.advanceAdvanceToNextState().state).toBe("EPFO_PROCESSING");
    expect(service.advanceAdvanceToNextState().state).toBe("CREDITED");

    const after = repository.getState();
    expect(after.member.currentPfBalancePaise).toBe(before - 1_000_000);
    expect(after.experience.pastClaims.at(-1)).toMatchObject({ type: "FORM_31", amountPaise: 1_000_000, state: "CREDITED" });
    expect(after.experience.memberActivities.at(-1)?.title).toBe("PF advance credited");
    expect(() => service.advanceAdvanceToNextState()).toThrow("already complete");
  });

  it("refuses an advance above the deterministic maximum", () => {
    service.setAdvanceGoal("MEDICAL");
    expect(() => service.submitAdvance(9_000_000)).toThrow("exceeds the deterministic eligible amount");
  });

  it("exposes a read model carrying the derived passbook", () => {
    const experience = service.getExperience();
    expect(experience.passbook.months).toHaveLength(7);
    expect(experience.passbook.monthsNeedingAttention).toEqual(["2026-03", "2026-06"]);
    expect(experience.advance.id).toBe("advance-demo-001");
    expect(experience.ecrs[0].state).toBe("VALIDATION_FAILED");
  });

  it("persists through the repository rather than mutating a shared object", () => {
    const snapshot = repository.getState();
    snapshot.member.currentPfBalancePaise = 1;
    expect(repository.getState().member.currentPfBalancePaise).not.toBe(1);
  });
});

// ------------------------------------------------------------------- Activity feed

describe("member activity feed", () => {
  const state = () => scenario();

  it("describes two blocker events distinctly instead of repeating one label", () => {
    const entries = buildMemberActivity(state(), 4);
    const blockers = entries.filter((entry) => entry.title.endsWith("issue detected"));
    expect(blockers).toHaveLength(2);
    expect(new Set(blockers.map((entry) => entry.title)).size).toBe(2);
    expect(blockers.map((entry) => entry.title).sort()).toEqual([
      "Date of Exit issue detected",
      "Legacy employment record issue detected",
    ]);
  });

  it("links each entry to the aggregate it describes", () => {
    const entries = buildMemberActivity(state(), 4);
    for (const entry of entries) {
      expect(entry.detail.length).toBeGreaterThan(0);
      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
    expect(entries.every((entry) => entry.href?.startsWith("/issues/"))).toBe(true);
  });

  it("marks an unresolved blocker as needing attention", () => {
    expect(buildMemberActivity(state(), 4).every((entry) => entry.tone === "attention")).toBe(true);
  });

  it("describes a posted contribution once the employer completes an ECR payment", () => {
    const repository = new InMemoryEpfoRepository();
    let n = 0;
    const service = new ExperienceV2ApplicationService(repository, () => new Date(NOW), (p) => `${p}-${++n}`);
    service.correctEcrRow(ECR_ID, "ecr-row-03");
    service.correctEcrRow(ECR_ID, "ecr-row-05");
    service.correctEcrRow(ECR_ID, "ecr-row-07");
    service.correctEcrRow(ECR_ID, "ecr-row-09", { uanMasked: "DEMO-••••-9001" });
    service.correctEcrRow(ECR_ID, "ecr-row-11", { wagePaise: 2_000_000 });
    service.generateChallan(ECR_ID);
    service.startEcrPayment(ECR_ID);
    service.completeEcrPayment(ECR_ID);

    const posted = buildMemberActivity(repository.getState(), 6)
      .find((entry) => entry.title === "August 2026 contribution posted");
    expect(posted).toBeDefined();
    expect(posted?.tone).toBe("complete");
    expect(posted?.href).toBe("/passbook?month=2026-08");
  });
});

describe("passbook highlights", () => {
  it("surfaces the newest months plus any earlier month needing attention", () => {
    const summary = summarisePassbook(scenario().experience.contributions);
    const highlights = selectPassbookHighlights(summary, 3);
    expect(highlights.map((m) => m.contribution.month)).toEqual([
      "2026-07",
      "2026-06",
      "2026-05",
      "2026-03",
    ]);
  });

  it("labels every posting status for display", () => {
    expect(contributionStatusLabel("POSTED")).toBe("Posted");
    expect(contributionStatusLabel("MISMATCH")).toBe("Needs attention");
    expect(contributionStatusLabel("RECONCILED")).toBe("Reconciled");
    expect(contributionStatusLabel("DELAYED")).toBe("Delayed");
    expect(contributionStatusLabel("MISSING")).toBe("Not posted");
  });

  it("carries a correction trace on the reconciled month only", () => {
    const contributions = scenario().experience.contributions;
    const may = contributions.find((item) => item.month === "2026-05");
    expect(may?.reconciliation).toMatchObject({
      originalEmployerEpfContributionPaise: 108_000,
      correctionNote: "Demo Systems Pvt Ltd filed a revised return for this month.",
    });
    expect(contributions.filter((item) => item.reconciliation !== null)).toHaveLength(1);
  });
});
