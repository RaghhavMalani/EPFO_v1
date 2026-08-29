import { ArrowRightIcon, CheckCircleIcon, WarningCircleIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { epfoService, experienceV2Service } from "@/application/service-instance";
import { PrototypeNotice } from "@/components/ui";
import { contributionStatusLabel, selectFocusMonth, type PassbookMonth } from "@/domain/contribution-health";
import type { ContributionStatus } from "@/domain/experience-v2";
import { formatAmount, formatCurrency, formatDate, formatMonth } from "@/lib/format";

export const metadata = { title: "Passbook" };

const STATUS_FILTERS: { value: string; label: string; matches: ContributionStatus[] }[] = [
  { value: "all", label: "All statuses", matches: ["POSTED", "DELAYED", "MISMATCH", "MISSING", "RECONCILED"] },
  { value: "posted", label: "Posted", matches: ["POSTED"] },
  { value: "attention", label: "Needs attention", matches: ["MISMATCH", "MISSING", "DELAYED"] },
  { value: "reconciled", label: "Reconciled", matches: ["RECONCILED"] },
];

const ATTENTION: ContributionStatus[] = ["MISMATCH", "MISSING", "DELAYED"];

function isAttention(status: ContributionStatus) {
  return ATTENTION.includes(status);
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Stacked contribution bars, one per month. The bar height is the recorded total against
 * the highest expected total in view, so a short-filed month reads as a shorter bar with
 * a missing band. The chart is a summary of the table below, never the only way to read it.
 */
function ContributionChart({ months }: { months: PassbookMonth[] }) {
  const width = 760;
  const height = 146;
  const plotTop = 12;
  const plotHeight = 96;
  const baseline = plotTop + plotHeight;
  const step = width / Math.max(months.length, 1);
  const barWidth = Math.min(66, step * 0.68);
  const scaleMax = Math.max(...months.map((m) => Math.max(m.health.expectedTotalPaise, m.health.recordedTotalPaise)), 1);
  const toHeight = (paise: number) => (paise / scaleMax) * plotHeight;

  return (
    <figure className="contribution-chart">
      <figcaption>
        <span>Monthly contribution, {formatMonth(months[0].contribution.month)} to {formatMonth(months.at(-1)!.contribution.month)}</span>
        <ul className="chart-legend">
          <li><i className="chart-key chart-key--employee" aria-hidden="true" />Employee</li>
          <li><i className="chart-key chart-key--employer" aria-hidden="true" />Employer EPF</li>
          <li><i className="chart-key chart-key--eps" aria-hidden="true" />EPS</li>
        </ul>
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="contribution-chart__svg"
        role="img"
        aria-label={`Monthly contribution totals from ${formatMonth(months[0].contribution.month)} to ${formatMonth(months.at(-1)!.contribution.month)}. The full figures are in the contribution ledger table below.`}
      >
        {[0, 0.5, 1].map((fraction) => (
          <line
            key={fraction}
            x1={0}
            x2={width}
            y1={baseline - fraction * plotHeight}
            y2={baseline - fraction * plotHeight}
            className="chart-grid"
          />
        ))}
        {months.map((month, index) => {
          const x = index * step + (step - barWidth) / 2;
          const employee = toHeight(month.contribution.employeeContributionPaise);
          const employer = toHeight(month.contribution.employerEpfContributionPaise);
          const eps = toHeight(month.contribution.epsContributionPaise);
          const attention = isAttention(month.health.status);
          return (
            <g key={month.contribution.id}>
              <rect x={x} y={baseline - employee} width={barWidth} height={employee} className="chart-bar chart-bar--employee" />
              <rect x={x} y={baseline - employee - employer} width={barWidth} height={employer} className="chart-bar chart-bar--employer" />
              <rect x={x} y={baseline - employee - employer - eps} width={barWidth} height={eps} className="chart-bar chart-bar--eps" />
              {attention ? (
                <rect x={x} y={baseline + 4} width={barWidth} height={3} className="chart-bar chart-bar--attention" />
              ) : null}
              <text x={x + barWidth / 2} y={height - 6} className={attention ? "chart-label chart-label--attention" : "chart-label"}>
                {formatMonth(month.contribution.month).replace(" 20", " ’")}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function ExplanationPanel({ month }: { month: PassbookMonth }) {
  const { contribution, health } = month;
  const attention = isAttention(health.status);
  const label = formatMonth(contribution.month, "long");

  return (
    <aside className={attention ? "explain-panel explain-panel--attention" : "explain-panel"} id="explain">
      <div className="explain-panel__head">
        <div>
          <p className="record-label">Contribution detail</p>
          <h2>{label}</h2>
        </div>
        <Link href="/passbook" className="explain-panel__close" aria-label="Close contribution detail">
          <XIcon size={16} aria-hidden="true" />
        </Link>
      </div>

      <p className="explain-panel__lead">{contribution.explanation}</p>

      <dl className="explain-figures">
        <div>
          <dt>Wage basis</dt>
          <dd className="tabular">{formatCurrency(contribution.wageBasisPaise)}</dd>
        </div>
        <div>
          <dt>Expected employer EPF</dt>
          <dd className="tabular">{formatCurrency(health.expectedEmployerContributionPaise)}</dd>
        </div>
        <div>
          <dt>Recorded employer EPF</dt>
          <dd className="tabular">{formatCurrency(contribution.employerEpfContributionPaise)}</dd>
        </div>
        <div>
          <dt>Difference</dt>
          <dd className={health.shortfallPaise > 0 ? "tabular explain-figures__gap" : "tabular"}>
            {formatCurrency(health.shortfallPaise)}
          </dd>
        </div>
      </dl>

      {health.differences.length > 0 ? (
        <div className="explain-block">
          <h3>What changed</h3>
          <ul>
            {health.differences.map((difference) => <li key={difference}>{difference}</li>)}
          </ul>
        </div>
      ) : null}

      {contribution.reconciliation ? (
        <div className="explain-block">
          <h3>Correction trace</h3>
          <ol className="reconcile-trace">
            <li>
              <span>Originally filed</span>
              <strong className="tabular">{formatCurrency(contribution.reconciliation.originalEmployerEpfContributionPaise)}</strong>
            </li>
            <li>
              <span>Correction filed {formatDate(contribution.reconciliation.correctedAt)}</span>
              <strong>{contribution.reconciliation.correctionNote}</strong>
            </li>
            <li>
              <span>Final posted employer EPF</span>
              <strong className="tabular">{formatCurrency(contribution.employerEpfContributionPaise)}</strong>
            </li>
          </ol>
        </div>
      ) : null}

      <dl className="explain-block explain-block--meta">
        <div>
          <dt>Contribution health</dt>
          <dd>{contributionStatusLabel(health.status)} ({health.status})</dd>
        </div>
        <div>
          <dt>Filed by</dt>
          <dd>{contribution.employerName}</dd>
        </div>
        <div>
          <dt>Possible next action</dt>
          <dd>
            {attention
              ? "Check this month against your payslip, then raise it with the employer record."
              : "Nothing is needed for this month."}
          </dd>
        </div>
      </dl>

      <Link href="/member" className="text-link text-link--flush">
        View employment record
        <ArrowRightIcon size={16} aria-hidden="true" />
      </Link>
    </aside>
  );
}

export default async function PassbookPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const snapshot = epfoService.getSnapshot();
  const passbook = experienceV2Service.getPassbook();

  const years = [...new Set(passbook.months.map((m) => m.contribution.month.slice(0, 4)))].sort();
  const employers = [...new Set(passbook.months.map((m) => m.contribution.employerName))].sort();

  const year = first(params.year) ?? "all";
  const employer = first(params.employer) ?? "all";
  const status = first(params.status) ?? "all";
  const statusFilter = STATUS_FILTERS.find((item) => item.value === status) ?? STATUS_FILTERS[0];

  const visible = passbook.months.filter((month) => {
    const matchesYear = year === "all" || month.contribution.month.startsWith(year);
    const matchesEmployer = employer === "all" || month.contribution.employerName === employer;
    return matchesYear && matchesEmployer && statusFilter.matches.includes(month.health.status);
  });

  const newestFirst = [...visible].reverse();
  const requestedMonth = first(params.month);
  const selected =
    newestFirst.find((m) => m.contribution.month === requestedMonth) ?? selectFocusMonth(visible);

  const totals = visible.reduce(
    (sum, month) => ({
      employee: sum.employee + month.contribution.employeeContributionPaise,
      employer: sum.employer + month.contribution.employerEpfContributionPaise,
      eps: sum.eps + month.contribution.epsContributionPaise,
    }),
    { employee: 0, employer: 0, eps: 0 },
  );
  const totalInView = totals.employee + totals.employer + totals.eps;
  const share = (part: number) => (totalInView === 0 ? "0%" : `${Math.round((part / totalInView) * 100)}%`);

  return (
    <div className="page-shell">
      <header className="passbook-masthead">
        <div>
          <h1>Passbook</h1>
          <p>Every month filed against your UAN, and what the contribution health check found.</p>
        </div>
        <form className="passbook-filters" method="get" action="/passbook">
          <div>
            <label htmlFor="filter-year">Year</label>
            <select id="filter-year" name="year" defaultValue={year}>
              <option value="all">All years</option>
              {years.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filter-employer">Employer</label>
            <select id="filter-employer" name="employer" defaultValue={employer}>
              <option value="all">All employers</option>
              {employers.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filter-status">Status</label>
            <select id="filter-status" name="status" defaultValue={status}>
              {STATUS_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <button type="submit">Apply</button>
        </form>
      </header>

      <section className="passbook-balance" aria-label="Balance and contribution totals">
        <div className="passbook-balance__anchor">
          <p className="record-label">Total PF balance</p>
          <p className="balance-value tabular">{formatCurrency(snapshot.member.currentPfBalancePaise)}</p>
          <p className="passbook-balance__note">
            Across {snapshot.member.employments.length} member records under {snapshot.member.uanMasked}
          </p>
        </div>
        <dl className="passbook-breakdown">
          <div>
            <dt>Employee contribution</dt>
            <dd className="tabular">{formatCurrency(totals.employee)}</dd>
            <span>{share(totals.employee)} of months shown</span>
          </div>
          <div>
            <dt>Employer EPF contribution</dt>
            <dd className="tabular">{formatCurrency(totals.employer)}</dd>
            <span>{share(totals.employer)} of months shown</span>
          </div>
          <div>
            <dt>Pension contribution (EPS)</dt>
            <dd className="tabular">{formatCurrency(totals.eps)}</dd>
            <span>{share(totals.eps)} of months shown</span>
          </div>
        </dl>
      </section>

      {visible.length > 0 ? <ContributionChart months={visible} /> : null}

      <section className="passbook-body">
        <div className="passbook-ledger">
          <div className="passbook-ledger__head">
            <h2>Contribution ledger</h2>
            <p className="section-support tabular">
              {visible.length} of {passbook.months.length} months
              {passbook.monthsNeedingAttention.length > 0
                ? ` · ${passbook.monthsNeedingAttention.length} needing attention`
                : ""}
            </p>
          </div>

          {visible.length === 0 ? (
            <p className="passbook-empty">
              No months match these filters. <Link href="/passbook">Clear filters</Link> to see every month.
            </p>
          ) : (
            <table className="ledger-table">
              <caption className="sr-only">Monthly provident fund contributions</caption>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Employer</th>
                  <th scope="col" className="ledger-table__num">Wage basis (₹)</th>
                  <th scope="col" className="ledger-table__num">Employee (₹)</th>
                  <th scope="col" className="ledger-table__num">Employer EPF (₹)</th>
                  <th scope="col" className="ledger-table__num">EPS (₹)</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Detail</span></th>
                </tr>
              </thead>
              <tbody>
                {newestFirst.map(({ contribution, health }) => {
                  const attention = isAttention(health.status);
                  const current = selected?.contribution.month === contribution.month;
                  return (
                    <tr
                      key={contribution.id}
                      className={`${attention ? "ledger-row--attention" : ""} ${current ? "ledger-row--current" : ""}`.trim()}
                    >
                      <th scope="row" data-label="Month">{formatMonth(contribution.month)}</th>
                      <td data-label="Employer">{contribution.employerName}</td>
                      <td data-label="Wage basis" className="ledger-table__num tabular">{formatAmount(contribution.wageBasisPaise)}</td>
                      <td data-label="Employee" className="ledger-table__num tabular">{formatAmount(contribution.employeeContributionPaise)}</td>
                      <td data-label="Employer EPF" className="ledger-table__num tabular">{formatAmount(contribution.employerEpfContributionPaise)}</td>
                      <td data-label="EPS" className="ledger-table__num tabular">{formatAmount(contribution.epsContributionPaise)}</td>
                      <td data-label="Status">
                        <span className={attention ? "ledger-status ledger-status--attention" : "ledger-status"}>
                          {attention
                            ? <WarningCircleIcon size={15} weight="fill" aria-hidden="true" />
                            : <CheckCircleIcon size={15} weight="fill" aria-hidden="true" />}
                          {contributionStatusLabel(health.status)}
                        </span>
                      </td>
                      <td data-label="Detail" className="ledger-table__action">
                        <Link href={`/passbook?month=${contribution.month}#explain`}>
                          {attention || health.status === "RECONCILED" ? "Understand this contribution" : "View detail"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="ledger-note">All amounts are in rupees, derived from the deterministic contribution health engine on synthetic data.</p>
        </div>

        {selected ? <ExplanationPanel month={selected} /> : null}
      </section>

      <PrototypeNotice compact />
    </div>
  );
}
