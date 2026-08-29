import { describe, expect, it } from "vitest";
import {
  EPS_MAX_PENSIONABLE_SERVICE_YEARS,
  EPS_PENSIONABLE_SALARY_CEILING_PAISE,
  estimateEpsPension,
  projectRetirementCorpus,
} from "@/domain/pension";

describe("EPS pension estimate", () => {
  it("applies the public formula shape: pensionable salary times service divided by 70", () => {
    const estimate = estimateEpsPension({ averageMonthlyWagePaise: 1_000_000, completedServiceYears: 14 });
    expect(estimate.pensionableSalaryPaise).toBe(1_000_000);
    expect(estimate.pensionableServiceYears).toBe(14);
    expect(estimate.monthlyPensionPaise).toBe(Math.round((1_000_000 * 14) / 70));
  });

  it("caps the pensionable salary at the statutory ceiling", () => {
    const estimate = estimateEpsPension({ averageMonthlyWagePaise: 5_000_000, completedServiceYears: 10 });
    expect(estimate.pensionableSalaryPaise).toBe(EPS_PENSIONABLE_SALARY_CEILING_PAISE);
  });

  it("adds the two-year bonus once completed service reaches 20 years", () => {
    const justUnder = estimateEpsPension({ averageMonthlyWagePaise: 1_500_000, completedServiceYears: 19 });
    const atThreshold = estimateEpsPension({ averageMonthlyWagePaise: 1_500_000, completedServiceYears: 20 });
    expect(justUnder.pensionableServiceYears).toBe(19);
    expect(atThreshold.pensionableServiceYears).toBe(22);
  });

  it("caps pensionable service at 35 years even with the bonus", () => {
    const estimate = estimateEpsPension({ averageMonthlyWagePaise: 1_500_000, completedServiceYears: 34 });
    expect(estimate.pensionableServiceYears).toBe(EPS_MAX_PENSIONABLE_SERVICE_YEARS);
  });
});

describe("retirement corpus projection", () => {
  it("compounds monthly at the fixed synthetic rate to the statutory retirement age", () => {
    const projection = projectRetirementCorpus({
      currentBalancePaise: 10_000_000,
      monthlyContributionPaise: 50_000,
      currentAge: 57,
    });
    expect(projection.yearsToRetirement).toBe(1);
    // 12 months of compounding at 8.25%/12 monthly, with a flat contribution added each month.
    let expected = 10_000_000;
    const monthlyRate = 0.0825 / 12;
    for (let i = 0; i < 12; i += 1) expected = expected * (1 + monthlyRate) + 50_000;
    expect(projection.corpusAtRetirementPaise).toBe(Math.round(expected));
  });

  it("returns the current balance unchanged when already at or past retirement age", () => {
    const projection = projectRetirementCorpus({
      currentBalancePaise: 20_000_000,
      monthlyContributionPaise: 50_000,
      currentAge: 60,
    });
    expect(projection.yearsToRetirement).toBe(0);
    expect(projection.corpusAtRetirementPaise).toBe(20_000_000);
    expect(projection.yearlyProjection).toEqual([{ age: 60, balancePaise: 20_000_000 }]);
  });

  it("produces one yearly checkpoint per year on top of the starting point", () => {
    const projection = projectRetirementCorpus({
      currentBalancePaise: 1_000_000,
      monthlyContributionPaise: 10_000,
      currentAge: 34,
    });
    expect(projection.yearlyProjection).toHaveLength(25); // starting point + 24 years to 58
    expect(projection.yearlyProjection[0]).toEqual({ age: 34, balancePaise: 1_000_000 });
    expect(projection.yearlyProjection.at(-1)?.age).toBe(58);
    expect(projection.yearlyProjection.at(-1)?.balancePaise).toBe(projection.corpusAtRetirementPaise);
  });

  it("grows strictly with a positive contribution and interest rate", () => {
    const projection = projectRetirementCorpus({
      currentBalancePaise: 1_000_000,
      monthlyContributionPaise: 10_000,
      currentAge: 50,
    });
    const balances = projection.yearlyProjection.map((point) => point.balancePaise);
    for (let i = 1; i < balances.length; i += 1) {
      expect(balances[i]).toBeGreaterThan(balances[i - 1]);
    }
  });
});
