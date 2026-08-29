import { expectedContributionFromWage } from "@/domain/contribution-health";
import type { EcrIssueCode, EcrRow } from "@/domain/experience-v2";

export type RawSyntheticPayrollRow = Omit<EcrRow, "status" | "issues">;

export function validateEcrRows(
  rows: RawSyntheticPayrollRow[],
  linkedMemberIds: Set<string>,
): EcrRow[] {
  const uanCounts = new Map<string, number>();
  for (const row of rows) {
    if (row.uanMasked.trim()) {
      uanCounts.set(row.uanMasked, (uanCounts.get(row.uanMasked) ?? 0) + 1);
    }
  }

  return rows.map((row) => {
    const issues: EcrRow["issues"] = [];
    const addIssue = (code: EcrIssueCode, field: string, message: string, expectedPaise: number | null = null) => {
      issues.push({ code, field, message, expectedPaise });
    };

    if (!row.employee.trim() || row.wagePaise <= 0) {
      addIssue("MISSING_REQUIRED_FIELD", "employee", "Employee name and wage are required.");
    }
    if (!row.uanMasked.trim()) {
      addIssue("MISSING_UAN", "uanMasked", "A masked synthetic UAN is required.");
    }
    if (row.uanMasked && (uanCounts.get(row.uanMasked) ?? 0) > 1) {
      addIssue("DUPLICATE_EMPLOYEE", "uanMasked", "This synthetic employee appears more than once in the payroll file.");
    }
    if (row.memberId && !linkedMemberIds.has(row.memberId)) {
      addIssue("EMPLOYMENT_RECORD_MISMATCH", "memberId", "The synthetic member is not linked to an active employment record.");
    }

    const expected = expectedContributionFromWage(row.wagePaise);
    if (row.employeeContributionPaise !== expected.employeePaise) {
      addIssue("UNEXPECTED_CONTRIBUTION", "employeeContributionPaise", "Employee contribution must equal 12% of the synthetic wage.", expected.employeePaise);
    }
    if (row.employerContributionPaise !== expected.employerPaise) {
      addIssue("UNEXPECTED_CONTRIBUTION", "employerContributionPaise", "Employer EPF contribution must match the employee contribution.", expected.employerPaise);
    }
    if (row.epsContributionPaise !== expected.epsPaise) {
      addIssue("UNEXPECTED_CONTRIBUTION", "epsContributionPaise", "EPS contribution does not match the deterministic wage rule.", expected.epsPaise);
    }

    return { ...row, status: issues.length > 0 ? "ISSUE" : "READY", issues };
  });
}

export function calculateEcrTotal(rows: EcrRow[]) {
  return rows
    .filter((row) => row.status !== "EXCLUDED")
    .reduce(
      (sum, row) => sum + row.employeeContributionPaise + row.employerContributionPaise + row.epsContributionPaise,
      0,
    );
}
