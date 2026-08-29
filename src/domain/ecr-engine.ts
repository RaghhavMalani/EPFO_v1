import { expectedContributionFromWage } from "@/domain/contribution-health";
import type { EcrIssueCode, EcrRow } from "@/domain/experience-v2";

export type RawSyntheticPayrollRow = Omit<EcrRow, "status" | "issues">;

/** Maps a masked synthetic UAN to the member record it belongs to. */
export type MemberDirectory = Map<string, string>;

export type EcrRowCorrection = {
  employee?: string;
  uanMasked?: string;
  wagePaise?: number;
};

export const PAYROLL_COLUMNS = [
  "employee",
  "memberId",
  "uanMasked",
  "wageRupees",
  "employeeContributionRupees",
  "employerContributionRupees",
  "epsContributionRupees",
] as const;

function toPaise(value: string, column: string): number {
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  const rupees = Number(trimmed);
  if (!Number.isFinite(rupees) || rupees < 0) {
    throw new Error(`Column ${column} must be a non-negative number in the synthetic payroll file.`);
  }
  return Math.round(rupees * 100);
}

/**
 * Parses a synthetic payroll file into raw rows. Structural problems (a missing header or
 * the wrong number of columns) throw, because the file cannot be read at all. Missing or
 * blank *values* deliberately do not throw — they survive into validation so the employer
 * sees them as row issues rather than an unusable upload.
 */
export function parseSyntheticPayroll(text: string): RawSyntheticPayrollRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");

  if (lines.length === 0) {
    throw new Error("The synthetic payroll file is empty.");
  }

  const header = lines[0].split(",").map((column) => column.trim());
  if (header.length !== PAYROLL_COLUMNS.length || PAYROLL_COLUMNS.some((column, index) => header[index] !== column)) {
    throw new Error(`The synthetic payroll header must be: ${PAYROLL_COLUMNS.join(",")}`);
  }

  return lines.slice(1).map((line, index) => {
    const cells = line.split(",").map((cell) => cell.trim());
    if (cells.length !== PAYROLL_COLUMNS.length) {
      throw new Error(`Payroll line ${index + 1} has ${cells.length} columns; ${PAYROLL_COLUMNS.length} are required.`);
    }
    const [employee, memberId, uanMasked, wage, employeeShare, employerShare, epsShare] = cells;
    return {
      id: `ecr-row-${String(index + 1).padStart(2, "0")}`,
      employee,
      memberId: memberId === "" ? null : memberId,
      uanMasked,
      wagePaise: toPaise(wage, "wageRupees"),
      employeeContributionPaise: toPaise(employeeShare, "employeeContributionRupees"),
      employerContributionPaise: toPaise(employerShare, "employerContributionRupees"),
      epsContributionPaise: toPaise(epsShare, "epsContributionRupees"),
    };
  });
}

/**
 * Deterministic ECR validation. Rows already marked `EXCLUDED` keep that status and are
 * not re-validated; every other row is validated from scratch so the same input always
 * produces the same issues.
 *
 * Duplicate detection is first-occurrence-wins: the earliest row carrying a masked UAN is
 * canonical and only later rows are flagged, so correcting the duplicate clears the file.
 */
export function validateEcrRows(
  rows: (RawSyntheticPayrollRow & Partial<Pick<EcrRow, "status">>)[],
  isLinkedMember: (memberId: string) => boolean,
): EcrRow[] {
  const seenUans = new Set<string>();

  return rows.map((row) => {
    if (row.status === "EXCLUDED") {
      return { ...row, status: "EXCLUDED", issues: [] };
    }

    const issues: EcrRow["issues"] = [];
    const addIssue = (
      code: EcrIssueCode,
      field: string,
      message: string,
      expectedPaise: number | null = null,
    ) => {
      issues.push({ code, field, message, expectedPaise });
    };

    if (!row.employee.trim()) {
      addIssue("MISSING_REQUIRED_FIELD", "employee", "An employee name is required.");
    }
    if (row.wagePaise <= 0) {
      addIssue("MISSING_REQUIRED_FIELD", "wagePaise", "A monthly wage basis greater than zero is required.");
    }

    const uan = row.uanMasked.trim();
    if (!uan) {
      addIssue("MISSING_UAN", "uanMasked", "A UAN is required on every payroll row.");
    } else if (seenUans.has(uan)) {
      addIssue("DUPLICATE_EMPLOYEE", "uanMasked", "This employee already appears earlier in the file.");
    } else {
      seenUans.add(uan);
    }

    if (row.memberId && !isLinkedMember(row.memberId)) {
      addIssue("EMPLOYMENT_RECORD_MISMATCH", "memberId", "This member is not linked to an active employment record.");
    }

    if (row.wagePaise > 0) {
      const expected = expectedContributionFromWage(row.wagePaise);
      if (row.employeeContributionPaise !== expected.employeePaise) {
        addIssue("UNEXPECTED_CONTRIBUTION", "employeeContributionPaise", "Employee contribution must equal 12% of the wage basis.", expected.employeePaise);
      }
      if (row.employerContributionPaise !== expected.employerPaise) {
        addIssue("UNEXPECTED_CONTRIBUTION", "employerContributionPaise", "Employer EPF contribution must match the employee contribution.", expected.employerPaise);
      }
      if (row.epsContributionPaise !== expected.epsPaise) {
        addIssue("UNEXPECTED_CONTRIBUTION", "epsContributionPaise", "EPS contribution does not match the deterministic wage rule.", expected.epsPaise);
      }
    }

    return { ...row, status: issues.length > 0 ? "ISSUE" : "READY", issues };
  });
}

/**
 * Produces the corrected form of a single row. Arithmetic, linkage, and duplication are
 * resolved deterministically; a missing name, wage, or UAN can only be supplied by the
 * employer, so those come in through `correction`.
 *
 * A duplicate row is excluded rather than rewritten — a repeated payroll line must not be
 * paid twice.
 */
export function correctEcrRow(
  row: EcrRow,
  directory: MemberDirectory,
  correction: EcrRowCorrection = {},
): EcrRow {
  if (row.issues.some((issue) => issue.code === "DUPLICATE_EMPLOYEE")) {
    return { ...row, status: "EXCLUDED", issues: [] };
  }

  const employee = correction.employee?.trim() || row.employee;
  const uanMasked = correction.uanMasked?.trim() || row.uanMasked;
  const wagePaise = correction.wagePaise ?? row.wagePaise;
  const expected = expectedContributionFromWage(wagePaise);
  const linkedMemberId = directory.get(uanMasked) ?? row.memberId;

  return {
    ...row,
    employee,
    uanMasked,
    wagePaise,
    memberId: linkedMemberId,
    employeeContributionPaise: expected.employeePaise,
    employerContributionPaise: expected.employerPaise,
    epsContributionPaise: expected.epsPaise,
    status: "READY",
    issues: [],
  };
}

export function calculateEcrTotal(rows: EcrRow[]) {
  return rows
    .filter((row) => row.status !== "EXCLUDED")
    .reduce(
      (sum, row) => sum + row.employeeContributionPaise + row.employerContributionPaise + row.epsContributionPaise,
      0,
    );
}

/** A file is payable once no row is still in issue. Excluded rows do not block it. */
export function ecrRowsAreClear(rows: EcrRow[]) {
  return rows.every((row) => row.status !== "ISSUE");
}

export function countEcrIssues(rows: EcrRow[]) {
  return rows.reduce((total, row) => total + row.issues.length, 0);
}
