import type { Contribution, ContributionStatus } from "@/domain/experience-v2";

export const EMPLOYEE_SHARE_RATE = 0.12;
export const EMPLOYER_SHARE_RATE = 0.12;
export const EPS_SHARE_RATE = 0.0833;
export const EPS_MONTHLY_CEILING_PAISE = 125_000;

export type ContributionHealth = {
  status: ContributionStatus;
  expectedEmployeeContributionPaise: number;
  expectedEmployerContributionPaise: number;
  expectedEpsContributionPaise: number;
  recordedTotalPaise: number;
  expectedTotalPaise: number;
  shortfallPaise: number;
  differences: string[];
};

export type PassbookMonth = {
  contribution: Contribution;
  health: ContributionHealth;
};

export type PassbookSummary = {
  months: PassbookMonth[];
  totalEmployeeContributionPaise: number;
  totalEmployerEpfContributionPaise: number;
  totalEpsContributionPaise: number;
  totalContributionPaise: number;
  totalShortfallPaise: number;
  countsByStatus: Record<ContributionStatus, number>;
  monthsNeedingAttention: string[];
};

export function expectedContributionFromWage(wageBasisPaise: number) {
  return {
    employeePaise: Math.round(wageBasisPaise * EMPLOYEE_SHARE_RATE),
    employerPaise: Math.round(wageBasisPaise * EMPLOYER_SHARE_RATE),
    epsPaise: Math.min(Math.round(wageBasisPaise * EPS_SHARE_RATE), EPS_MONTHLY_CEILING_PAISE),
  };
}

/**
 * Deterministic contribution health. The recorded `postingStatus` describes what the
 * source system declared; this engine decides the health of the record itself.
 *
 * `RECONCILED` and `MISSING` are terminal declarations and are preserved as-is.
 * `DELAYED` is a timing fact rather than an arithmetic one, so it survives even when
 * amounts are present, while still reporting any arithmetic differences alongside it.
 */
export function evaluateContributionHealth(
  contribution: Contribution,
  expected = expectedContributionFromWage(contribution.wageBasisPaise),
): ContributionHealth {
  const recordedTotalPaise =
    contribution.employeeContributionPaise +
    contribution.employerEpfContributionPaise +
    contribution.epsContributionPaise;
  const expectedTotalPaise = expected.employeePaise + expected.employerPaise + expected.epsPaise;

  const base = {
    expectedEmployeeContributionPaise: expected.employeePaise,
    expectedEmployerContributionPaise: expected.employerPaise,
    expectedEpsContributionPaise: expected.epsPaise,
    recordedTotalPaise,
    expectedTotalPaise,
    shortfallPaise: Math.max(0, expectedTotalPaise - recordedTotalPaise),
  };

  if (contribution.postingStatus === "RECONCILED") {
    return { ...base, status: "RECONCILED", shortfallPaise: 0, differences: [] };
  }

  const differences: string[] = [];
  if (contribution.employeeContributionPaise !== expected.employeePaise) {
    differences.push("Employee contribution differs from the wage-based expectation.");
  }
  if (contribution.employerEpfContributionPaise !== expected.employerPaise) {
    differences.push("Employer EPF contribution differs from the wage-based expectation.");
  }
  if (contribution.epsContributionPaise !== expected.epsPaise) {
    differences.push("EPS contribution differs from the wage-based expectation.");
  }

  if (contribution.postingStatus === "DELAYED") {
    return {
      ...base,
      status: "DELAYED",
      differences: [
        contribution.postedAt === null
          ? "This month has not been posted yet."
          : "This month was posted after the expected posting date.",
        ...differences,
      ],
    };
  }

  if (contribution.postingStatus === "MISSING" || recordedTotalPaise === 0) {
    return {
      ...base,
      status: "MISSING",
      differences: ["No contribution values were recorded for this month."],
    };
  }

  return { ...base, status: differences.length > 0 ? "MISMATCH" : "POSTED", differences };
}

const EMPTY_COUNTS: Record<ContributionStatus, number> = {
  POSTED: 0,
  DELAYED: 0,
  MISMATCH: 0,
  MISSING: 0,
  RECONCILED: 0,
};

const ATTENTION_STATUSES: ContributionStatus[] = ["DELAYED", "MISMATCH", "MISSING"];

/**
 * Deterministic passbook read model. Months are ordered oldest to newest by month key
 * so the same contribution set always produces the same summary.
 */
export function summarisePassbook(contributions: Contribution[]): PassbookSummary {
  const months = [...contributions]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((contribution) => ({ contribution, health: evaluateContributionHealth(contribution) }));

  const countsByStatus = { ...EMPTY_COUNTS };
  for (const { health } of months) {
    countsByStatus[health.status] += 1;
  }

  return {
    months,
    totalEmployeeContributionPaise: months.reduce((sum, m) => sum + m.contribution.employeeContributionPaise, 0),
    totalEmployerEpfContributionPaise: months.reduce((sum, m) => sum + m.contribution.employerEpfContributionPaise, 0),
    totalEpsContributionPaise: months.reduce((sum, m) => sum + m.contribution.epsContributionPaise, 0),
    totalContributionPaise: months.reduce((sum, m) => sum + m.health.recordedTotalPaise, 0),
    totalShortfallPaise: months.reduce((sum, m) => sum + m.health.shortfallPaise, 0),
    countsByStatus,
    monthsNeedingAttention: months
      .filter((m) => ATTENTION_STATUSES.includes(m.health.status))
      .map((m) => m.contribution.month),
  };
}

const STATUS_LABELS: Record<ContributionStatus, string> = {
  POSTED: "Posted",
  DELAYED: "Delayed",
  MISMATCH: "Needs attention",
  MISSING: "Not posted",
  RECONCILED: "Reconciled",
};

export function contributionStatusLabel(status: ContributionStatus) {
  return STATUS_LABELS[status];
}

/**
 * The months worth surfacing outside the full passbook: the most recent few, plus any
 * earlier month still needing attention. Newest first, no duplicates.
 */
export function selectPassbookHighlights(summary: PassbookSummary, recentCount = 3): PassbookMonth[] {
  const newestFirst = [...summary.months].reverse();
  const recent = newestFirst.slice(0, recentCount);
  const attention = newestFirst
    .slice(recentCount)
    .filter((month) => ATTENTION_STATUSES.includes(month.health.status));
  return [...recent, ...attention];
}

/** Most severe first, so the passbook opens on the month that most needs reading. */
const FOCUS_PRIORITY: Record<ContributionStatus, number> = {
  MISSING: 0,
  MISMATCH: 1,
  DELAYED: 2,
  RECONCILED: 3,
  POSTED: 4,
};

/**
 * The month a passbook view should explain by default: the most severe health status,
 * and among equals the most recent. Returns null when there is nothing to show.
 */
export function selectFocusMonth(months: PassbookMonth[]): PassbookMonth | null {
  if (months.length === 0) return null;
  return [...months].sort((a, b) => {
    const priority = FOCUS_PRIORITY[a.health.status] - FOCUS_PRIORITY[b.health.status];
    return priority !== 0 ? priority : b.contribution.month.localeCompare(a.contribution.month);
  })[0];
}
