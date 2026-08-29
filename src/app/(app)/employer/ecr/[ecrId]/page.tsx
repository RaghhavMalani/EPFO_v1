import { CheckCircleIcon, FileTextIcon, UserCircleIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import { epfoService, experienceV2Service } from "@/application/service-instance";
import { ActionButton } from "@/components/action-button";
import { EcrRowCorrectionForm } from "@/components/ecr-row-correction-form";
import { LinkButton, PageHeader, PrototypeNotice } from "@/components/ui";
import type { EcrIssueCode, EcrRow } from "@/domain/experience-v2";
import { formatAmount, formatCurrency, formatMonth, humanizeState } from "@/lib/format";

export const metadata = { title: "ECR filing" };

const STATE_TONE: Record<string, string> = {
  DRAFT: "status-badge--info",
  VALIDATION_FAILED: "status-badge--danger",
  READY: "status-badge--success",
  CHALLAN_GENERATED: "status-badge--info",
  PAYMENT_PROCESSING: "status-badge--warning",
  PAID: "status-badge--success",
};

const ISSUE_CODE_LABELS: Record<EcrIssueCode, string> = {
  DUPLICATE_EMPLOYEE: "Duplicate employee",
  MISSING_UAN: "Missing UAN",
  EMPLOYMENT_RECORD_MISMATCH: "Employment record mismatch",
  UNEXPECTED_CONTRIBUTION: "Unexpected contribution",
  MISSING_REQUIRED_FIELD: "Missing required field",
};

const ISSUE_CODES = Object.keys(ISSUE_CODE_LABELS) as EcrIssueCode[];

function rowTotal(row: EcrRow) {
  return row.employeeContributionPaise + row.employerContributionPaise + row.epsContributionPaise;
}

export default async function EcrFilingPage({
  params,
  searchParams,
}: {
  params: Promise<{ ecrId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { ecrId } = await params;
  const { view } = await searchParams;
  const snapshot = epfoService.getSnapshot();
  const experience = experienceV2Service.getExperience();
  const ecr = experience.ecrs.find((item) => item.id === ecrId);
  if (!ecr) notFound();

  const showAll = view === "all";
  const readyRows = ecr.rows.filter((row) => row.status === "READY");
  const issueRows = ecr.rows.filter((row) => row.status === "ISSUE");
  const excludedRows = ecr.rows.filter((row) => row.status === "EXCLUDED");
  const visibleRows = showAll ? ecr.rows : issueRows;

  const issueCounts = ISSUE_CODES.reduce((acc, code) => {
    acc[code] = ecr.rows.reduce((count, row) => count + row.issues.filter((issue) => issue.code === code).length, 0);
    return acc;
  }, {} as Record<EcrIssueCode, number>);

  const postedContribution = experience.contributions.find((item) => item.sourceEcrId === ecr.id);
  const pfIncreasePaise = postedContribution
    ? postedContribution.employeeContributionPaise + postedContribution.employerEpfContributionPaise
    : 0;

  return (
    <div className="page-shell employer-page">
      <PageHeader
        eyebrow={`Payroll · ${formatMonth(ecr.month)}`}
        title={ecr.filename}
        description="Deterministic payroll validation, row-level correction, challan generation, and payment — one filing at a time."
        backHref="/employer"
        backLabel="Employer overview"
        aside={<span className={`status-badge ${STATE_TONE[ecr.state]}`}><FileTextIcon size={14} weight="fill" aria-hidden="true" />{humanizeState(ecr.state)}</span>}
      />

      <section className="ecr-summary panel" aria-label="Filing summary" key={ecr.state}>
        <div className="ecr-summary__head state-enter">
          <div>
            <p className="record-label">Total contribution</p>
            <h2 className="section-title tabular">{formatCurrency(ecr.totalContributionPaise)}</h2>
          </div>
        </div>
        <dl className="ecr-summary__stats">
          <div><dt>Ready rows</dt><dd className="tabular">{readyRows.length}</dd></div>
          <div><dt>Rows with issues</dt><dd className={issueRows.length > 0 ? "tabular ecr-summary__stat--attention" : "tabular"}>{issueRows.length}</dd></div>
          <div><dt>Excluded</dt><dd className="tabular">{excludedRows.length}</dd></div>
          <div><dt>Total rows</dt><dd className="tabular">{ecr.rows.length}</dd></div>
        </dl>
      </section>

      <section className="py-8" aria-label="Issue inspector">
        <h2 className="section-title">Issue inspector</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Every row issue falls into one of five deterministic codes.</p>
        <div className="issue-inspector">
          {ISSUE_CODES.map((code) => (
            <div key={code} className={issueCounts[code] > 0 ? "issue-inspector__item issue-inspector__item--active" : "issue-inspector__item"}>
              <strong className="tabular">{issueCounts[code]}</strong>
              <span>{ISSUE_CODE_LABELS[code]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="py-4" aria-label="Payroll rows">
        <div className="section-heading-row">
          <div><p className="record-label">Payroll</p><h2 className="section-title">{showAll ? `All ${ecr.rows.length} rows` : `${issueRows.length} row${issueRows.length === 1 ? "" : "s"} needing review`}</h2></div>
          <Link href={showAll ? `/employer/ecr/${ecr.id}` : `/employer/ecr/${ecr.id}?view=all`} className="text-link text-link--flush">
            {showAll ? "Show issues only" : `Show all ${ecr.rows.length} rows`}
          </Link>
        </div>

        {visibleRows.length === 0 ? (
          <p className="employer-empty panel">No rows need review. Every payroll row is ready to file.</p>
        ) : (
          <div className="ecr-table panel">
            {visibleRows.map((row) => {
              const isSharedMember = row.memberId === snapshot.member.id;
              return (
                <article key={row.id} className={row.status === "ISSUE" ? "ecr-row ecr-row--issue" : "ecr-row"}>
                  <div className="ecr-row__summary">
                    <div className="ecr-row__identity">
                      <strong>{row.employee}</strong>
                      {isSharedMember ? <span className="ecr-row__badge"><UserCircleIcon size={13} weight="fill" aria-hidden="true" />Linked member</span> : null}
                      <small className="tabular">{row.uanMasked || "No masked UAN"}</small>
                    </div>
                    <div className="ecr-row__figures">
                      <span className="tabular">Wage ₹{formatAmount(row.wagePaise)}</span>
                      <span className="tabular">Total ₹{formatAmount(rowTotal(row))}</span>
                    </div>
                    <div className={row.status === "ISSUE" ? "ecr-row__status ecr-row__status--issue" : row.status === "EXCLUDED" ? "ecr-row__status ecr-row__status--excluded" : "ecr-row__status ecr-row__status--ready"}>
                      {row.status === "ISSUE" ? <WarningCircleIcon size={15} weight="fill" aria-hidden="true" /> : <CheckCircleIcon size={15} weight="fill" aria-hidden="true" />}
                      {humanizeState(row.status)}
                    </div>
                  </div>
                  {row.issues.length > 0 ? (
                    <ul className="ecr-row__issues">
                      {row.issues.map((issue, index) => (
                        <li key={`${row.id}-${issue.code}-${index}`}>
                          <strong>{ISSUE_CODE_LABELS[issue.code]}</strong> — {issue.message}
                          {issue.expectedPaise !== null ? ` Expected ${formatCurrency(issue.expectedPaise)}.` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {row.status === "ISSUE" ? <EcrRowCorrectionForm ecrId={ecr.id} row={row} /> : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="py-8" aria-label="Filing actions">
        <h2 className="section-title">Filing actions</h2>
        <div className="ecr-actions panel">
          {ecr.state === "PAID" ? (
            <div className="ecr-payoff state-enter">
              <CheckCircleIcon size={26} weight="fill" className="text-[var(--success)]" aria-hidden="true" />
              <div>
                <p className="font-semibold">Payment complete — the shared member was credited</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  {postedContribution
                    ? `${formatCurrency(pfIncreasePaise)} was posted to ${snapshot.member.name}'s PF balance for ${formatMonth(ecr.month)}, and the passbook now shows this contribution as posted.`
                    : "The payment completed and posted the linked member's contribution."}
                </p>
                <p className="mt-2 text-sm font-semibold tabular">
                  {snapshot.member.name}&apos;s PF balance is now {formatCurrency(snapshot.member.currentPfBalancePaise)}.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <LinkButton href={`/passbook?month=${ecr.month}`}>View posted contribution in passbook</LinkButton>
                </div>
              </div>
            </div>
          ) : (
            <div className="ecr-actions__row">
              <ActionButton endpoint={`/api/employer/ecr/${ecr.id}`} body={{ action: "VALIDATE" }} variant="secondary">
                Re-run validation
              </ActionButton>
              <ActionButton
                endpoint={`/api/employer/ecr/${ecr.id}`}
                body={{ action: "GENERATE_CHALLAN" }}
                disabled={ecr.state !== "READY"}
              >
                Generate challan
              </ActionButton>
              <ActionButton
                endpoint={`/api/employer/ecr/${ecr.id}`}
                body={{ action: "START_PAYMENT" }}
                disabled={ecr.state !== "CHALLAN_GENERATED"}
              >
                Start payment
              </ActionButton>
              <ActionButton
                endpoint={`/api/employer/ecr/${ecr.id}`}
                body={{ action: "CONFIRM_PAYMENT" }}
                disabled={ecr.state !== "PAYMENT_PROCESSING"}
              >
                Confirm payment
              </ActionButton>
            </div>
          )}
          {ecr.challanId ? <p className="mt-4 text-xs text-[var(--muted)] tabular">Challan {ecr.challanId}</p> : null}
        </div>
      </section>

      <PrototypeNotice compact />
    </div>
  );
}
