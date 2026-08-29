import type { Contribution, ContributionStatus } from "@/domain/experience-v2";

export type ContributionHealth = {
  status: ContributionStatus;
  expectedEmployeeContributionPaise: number;
  expectedEmployerContributionPaise: number;
  expectedEpsContributionPaise: number;
  differences: string[];
};

export function expectedContributionFromWage(wageBasisPaise: number) {
  return {
    employeePaise: Math.round(wageBasisPaise * 0.12),
    employerPaise: Math.round(wageBasisPaise * 0.12),
    epsPaise: Math.min(Math.round(wageBasisPaise * 0.0833), 125_000),
  };
}

export function evaluateContributionHealth(
  contribution: Contribution,
  expected = expectedContributionFromWage(contribution.wageBasisPaise),
): ContributionHealth {
  if (contribution.postingStatus === "RECONCILED") {
    return {
      status: "RECONCILED",
      expectedEmployeeContributionPaise: expected.employeePaise,
      expectedEmployerContributionPaise: expected.employerPaise,
      expectedEpsContributionPaise: expected.epsPaise,
      differences: [],
    };
  }

  const totalRecorded =
    contribution.employeeContributionPaise +
    contribution.employerEpfContributionPaise +
    contribution.epsContributionPaise;

  if (totalRecorded === 0) {
    return {
      status: contribution.postingStatus === "DELAYED" ? "DELAYED" : "MISSING",
      expectedEmployeeContributionPaise: expected.employeePaise,
      expectedEmployerContributionPaise: expected.employerPaise,
      expectedEpsContributionPaise: expected.epsPaise,
      differences: ["No contribution values were recorded for this month."],
    };
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

  return {
    status: differences.length > 0 ? "MISMATCH" : "POSTED",
    expectedEmployeeContributionPaise: expected.employeePaise,
    expectedEmployerContributionPaise: expected.employerPaise,
    expectedEpsContributionPaise: expected.epsPaise,
    differences,
  };
}
