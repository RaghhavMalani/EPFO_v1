/**
 * A separate, explicitly synthetic decomposition used only for the "Where does my
 * money go?" educational panel. It illustrates the public 12% / 3.67% / 8.33%
 * statutory shape from the wage basis alone, and is deliberately independent of the
 * ledger's own posting model in `contribution-health.ts` (documented as a distinct
 * synthetic assumption in `docs/POLICY_SOURCES.md`).
 */

export const STATUTORY_EMPLOYEE_PF_RATE = 0.12;
export const STATUTORY_EMPLOYER_PF_RATE = 0.0367;
export const STATUTORY_EMPLOYER_EPS_RATE = 0.0833;

export type ContributionSplit = {
  wageBasisPaise: number;
  employeePfPaise: number;
  employerPfPaise: number;
  employerEpsPaise: number;
  totalPaise: number;
  employeePfSharePercent: number;
  employerPfSharePercent: number;
  employerEpsSharePercent: number;
  /** Each share's proportion of the combined 24% total, for a proportional bar. */
  employeePfShareOfTotalPercent: number;
  employerPfShareOfTotalPercent: number;
  employerEpsShareOfTotalPercent: number;
};

const RATE_TOTAL = STATUTORY_EMPLOYEE_PF_RATE + STATUTORY_EMPLOYER_PF_RATE + STATUTORY_EMPLOYER_EPS_RATE;

/** Decomposes a monthly wage basis into the statutory synthetic split. */
export function splitContribution(wageBasisPaise: number): ContributionSplit {
  const employeePfPaise = Math.round(wageBasisPaise * STATUTORY_EMPLOYEE_PF_RATE);
  const employerPfPaise = Math.round(wageBasisPaise * STATUTORY_EMPLOYER_PF_RATE);
  const employerEpsPaise = Math.round(wageBasisPaise * STATUTORY_EMPLOYER_EPS_RATE);
  return {
    wageBasisPaise,
    employeePfPaise,
    employerPfPaise,
    employerEpsPaise,
    totalPaise: employeePfPaise + employerPfPaise + employerEpsPaise,
    employeePfSharePercent: STATUTORY_EMPLOYEE_PF_RATE * 100,
    employerPfSharePercent: Math.round(STATUTORY_EMPLOYER_PF_RATE * 10_000) / 100,
    employerEpsSharePercent: Math.round(STATUTORY_EMPLOYER_EPS_RATE * 10_000) / 100,
    employeePfShareOfTotalPercent: (STATUTORY_EMPLOYEE_PF_RATE / RATE_TOTAL) * 100,
    employerPfShareOfTotalPercent: (STATUTORY_EMPLOYER_PF_RATE / RATE_TOTAL) * 100,
    employerEpsShareOfTotalPercent: (STATUTORY_EMPLOYER_EPS_RATE / RATE_TOTAL) * 100,
  };
}
