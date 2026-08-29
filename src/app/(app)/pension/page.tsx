import { epfoService, experienceV2Service } from "@/application/service-instance";
import { PageHeader, PrototypeNotice } from "@/components/ui";
import { RetirementChart } from "@/components/retirement-chart";
import { completedServiceMonths } from "@/domain/advance-policy";
import {
  EPF_SYNTHETIC_ANNUAL_INTEREST_RATE,
  RETIREMENT_AGE,
  SYNTHETIC_MEMBER_CURRENT_AGE,
  estimateEpsPension,
  projectRetirementCorpus,
} from "@/domain/pension";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Pension and retirement projection" };

const AS_OF = "2026-08-29T05:00:00.000Z";

export default function PensionPage() {
  const { member } = epfoService.getSnapshot();
  const experience = experienceV2Service.getExperience();

  const serviceMonths = completedServiceMonths(member, AS_OF);
  const completedServiceYears = Math.floor(serviceMonths / 12);

  const wageSamples = experience.contributions.map((contribution) => contribution.wageBasisPaise).filter((paise) => paise > 0);
  const averageMonthlyWagePaise = wageSamples.length > 0
    ? Math.round(wageSamples.reduce((sum, paise) => sum + paise, 0) / wageSamples.length)
    : 0;

  const latestContribution = [...experience.contributions].toSorted((a, b) => b.month.localeCompare(a.month)).at(0);
  const monthlyContributionPaise = latestContribution
    ? latestContribution.employeeContributionPaise + latestContribution.employerEpfContributionPaise + latestContribution.epsContributionPaise
    : 0;

  const pension = estimateEpsPension({ averageMonthlyWagePaise, completedServiceYears });
  const projection = projectRetirementCorpus({
    currentBalancePaise: member.currentPfBalancePaise,
    monthlyContributionPaise,
    currentAge: SYNTHETIC_MEMBER_CURRENT_AGE,
  });

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Online Services · Illustration"
        title="Pension and retirement projection"
        description="Two synthetic illustrations built from your deterministic PF record: a public-formula EPS pension estimate, and a compounding retirement corpus projection to age 58."
      />

      <section className="pension-anchor" aria-label="Projected corpus at retirement">
        <p className="record-label">Projected corpus at age {RETIREMENT_AGE}</p>
        <p className="balance-value tabular">{formatCurrency(projection.corpusAtRetirementPaise)}</p>
        <p className="pension-anchor__note">
          Starting from today&apos;s {formatCurrency(projection.startingBalancePaise)} balance, assuming a flat {formatCurrency(monthlyContributionPaise)} monthly contribution compounding at the synthetic {(EPF_SYNTHETIC_ANNUAL_INTEREST_RATE * 100).toFixed(2)}% annual EPF rate over the next {projection.yearsToRetirement} years. This is an illustration, not a guarantee.
        </p>
      </section>

      <figure className="retirement-chart">
        <figcaption>Projected balance, age {projection.yearlyProjection[0].age} to {RETIREMENT_AGE}</figcaption>
        <RetirementChart points={projection.yearlyProjection} />
      </figure>

      <section className="py-8" aria-label="EPS pension estimate">
        <h2 className="section-title">Synthetic EPS pension estimate</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{pension.formulaExplanation}</p>
        <div className="pension-facts panel">
          <div><dt>Monthly pension estimate</dt><dd className="tabular">{formatCurrency(pension.monthlyPensionPaise)}</dd></div>
          <div><dt>Pensionable salary (capped)</dt><dd className="tabular">{formatCurrency(pension.pensionableSalaryPaise)}</dd></div>
          <div><dt>Pensionable service</dt><dd className="tabular">{pension.pensionableServiceYears} years</dd></div>
          <div><dt>Completed service (recorded)</dt><dd className="tabular">{completedServiceYears} years</dd></div>
        </div>
        <ul className="pension-assumptions">
          <li>Pensionable salary is capped at the public ₹15,000 monthly ceiling and uses this record&apos;s average wage basis as a stand-in for EPFO&apos;s 60-month averaging window.</li>
          <li>Pensionable service adds the standard two-year bonus once completed service reaches 20 years, capped at 35 years overall.</li>
          <li>The retirement age, current age, and annual EPF rate used above are documented synthetic assumptions — see Policy Sources.</li>
        </ul>
      </section>

      <PrototypeNotice compact />
    </div>
  );
}
