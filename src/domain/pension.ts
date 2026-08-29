/**
 * Two independent, deterministic pension and retirement illustrations. Both are
 * hackathon interpretations of public formula shapes, not official EPFO figures —
 * see `docs/POLICY_SOURCES.md` for the public sources and synthetic assumptions.
 */

// ---------------------------------------------------------------- EPS pension estimate

/** Current public EPS pensionable-salary ceiling: ₹15,000 per month. */
export const EPS_PENSIONABLE_SALARY_CEILING_PAISE = 1_500_000;
export const EPS_FORMULA_DIVISOR = 70;
export const EPS_SERVICE_BONUS_YEARS = 2;
export const EPS_SERVICE_BONUS_THRESHOLD_YEARS = 20;
export const EPS_MAX_PENSIONABLE_SERVICE_YEARS = 35;

export type EpsPensionEstimate = {
  pensionableSalaryPaise: number;
  pensionableServiceYears: number;
  monthlyPensionPaise: number;
  formulaExplanation: string;
};

/**
 * Synthetic EPS pension estimate using the public formula shape: pensionable salary
 * (capped at the statutory ceiling) × pensionable service ÷ 70. Completed service of
 * 20 years or more earns the standard two-year bonus, and pensionable service is
 * capped at 35 years.
 */
export function estimateEpsPension({
  averageMonthlyWagePaise,
  completedServiceYears,
}: {
  averageMonthlyWagePaise: number;
  completedServiceYears: number;
}): EpsPensionEstimate {
  const pensionableSalaryPaise = Math.min(averageMonthlyWagePaise, EPS_PENSIONABLE_SALARY_CEILING_PAISE);
  const bonusYears = completedServiceYears >= EPS_SERVICE_BONUS_THRESHOLD_YEARS ? EPS_SERVICE_BONUS_YEARS : 0;
  const pensionableServiceYears = Math.min(
    completedServiceYears + bonusYears,
    EPS_MAX_PENSIONABLE_SERVICE_YEARS,
  );
  const monthlyPensionPaise = Math.round((pensionableSalaryPaise * pensionableServiceYears) / EPS_FORMULA_DIVISOR);

  return {
    pensionableSalaryPaise,
    pensionableServiceYears,
    monthlyPensionPaise,
    formulaExplanation:
      "Synthetic illustration: pensionable salary (capped at ₹15,000) × pensionable service ÷ 70.",
  };
}

// ---------------------------------------------------------- Retirement corpus projection

/** Public EPF interest rate declared for FY 2024-25, used as a fixed synthetic constant. */
export const EPF_SYNTHETIC_ANNUAL_INTEREST_RATE = 0.0825;
export const RETIREMENT_AGE = 58;

/** The synthetic persona's current age. Not modelled on `Member` — it exists only for this illustration. */
export const SYNTHETIC_MEMBER_CURRENT_AGE = 34;

export type CorpusProjectionPoint = { age: number; balancePaise: number };

export type RetirementCorpusProjection = {
  startingBalancePaise: number;
  monthlyContributionPaise: number;
  annualInterestRate: number;
  yearsToRetirement: number;
  corpusAtRetirementPaise: number;
  yearlyProjection: CorpusProjectionPoint[];
};

/**
 * Deterministic retirement corpus projection: the current balance plus assumed flat
 * monthly contributions, compounded monthly at a fixed synthetic interest rate, to
 * the statutory retirement age. Interest never accrues past retirement age, and a
 * non-positive gap to retirement returns the current balance unchanged.
 */
export function projectRetirementCorpus({
  currentBalancePaise,
  monthlyContributionPaise,
  currentAge,
  retirementAge = RETIREMENT_AGE,
  annualInterestRate = EPF_SYNTHETIC_ANNUAL_INTEREST_RATE,
}: {
  currentBalancePaise: number;
  monthlyContributionPaise: number;
  currentAge: number;
  retirementAge?: number;
  annualInterestRate?: number;
}): RetirementCorpusProjection {
  const monthlyRate = annualInterestRate / 12;
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const totalMonths = yearsToRetirement * 12;

  let balance = currentBalancePaise;
  const yearlyProjection: CorpusProjectionPoint[] = [{ age: currentAge, balancePaise: Math.round(balance) }];
  for (let month = 1; month <= totalMonths; month += 1) {
    balance = balance * (1 + monthlyRate) + monthlyContributionPaise;
    if (month % 12 === 0) {
      yearlyProjection.push({ age: currentAge + month / 12, balancePaise: Math.round(balance) });
    }
  }

  return {
    startingBalancePaise: currentBalancePaise,
    monthlyContributionPaise,
    annualInterestRate,
    yearsToRetirement,
    corpusAtRetirementPaise: Math.round(balance),
    yearlyProjection,
  };
}
