import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
  UsersIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { epfoService, experienceV2Service } from "@/application/service-instance";
import { PageHeader, PrototypeNotice, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDateTime, formatMonth, humanizeState } from "@/lib/format";

export const metadata = { title: "Employer operations" };

const ECR_STATE_TONE: Record<string, string> = {
  DRAFT: "status-badge--info",
  VALIDATION_FAILED: "status-badge--danger",
  READY: "status-badge--success",
  CHALLAN_GENERATED: "status-badge--info",
  PAYMENT_PROCESSING: "status-badge--warning",
  PAID: "status-badge--success",
};

export default function EmployerPage() {
  const snapshot = epfoService.getSnapshot();
  const experience = experienceV2Service.getExperience();

  const actionable = snapshot.employerRequests.filter((request) => request.status === "AWAITING_REVIEW" || request.status === "IN_REVIEW");
  const processed = snapshot.employerRequests
    .filter((request) => request.status === "APPROVED" || request.status === "REJECTED")
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const waiting = snapshot.employerRequests.filter((request) => request.status === "INFORMATION_REQUESTED");

  const latestEcr = [...experience.ecrs].toSorted((a, b) => b.month.localeCompare(a.month)).at(0);
  const ecrRowCounts = latestEcr
    ? {
        ready: latestEcr.rows.filter((row) => row.status === "READY").length,
        issue: latestEcr.rows.filter((row) => row.status === "ISSUE").length,
        excluded: latestEcr.rows.filter((row) => row.status === "EXCLUDED").length,
      }
    : null;

  const sharedEmployment = snapshot.member.employments.find((record) => record.employerName === snapshot.employer.name);
  const latestContribution = [...experience.contributions].toSorted((a, b) => b.month.localeCompare(a.month)).at(0);

  return (
    <div className="page-shell employer-page">
      <PageHeader
        eyebrow="Employer overview"
        title="Operations overview"
        description="Review member-record changes, track this month's payroll filing, and keep every decision traceable."
      />

      <section className="queue-metrics panel" aria-label="Request queue summary">
        <div><ClockIcon size={18} weight="fill" aria-hidden="true" /><span>Need action</span><strong className="tabular">{actionable.length}</strong></div>
        <div><WarningCircleIcon size={18} weight="fill" aria-hidden="true" /><span>Waiting on member</span><strong className="tabular">{waiting.length}</strong></div>
        <div><CheckCircleIcon size={18} weight="fill" aria-hidden="true" /><span>Processed</span><strong className="tabular">{processed.length}</strong></div>
        <div><span>Establishment</span><strong>{snapshot.employer.establishmentIdMasked}</strong><small>{snapshot.employer.pfOffice}</small></div>
      </section>

      <section className="employer-split" aria-label="Payroll filing and member impact">
        {latestEcr && ecrRowCounts ? (
          <div className="ecr-summary panel">
            <div className="ecr-summary__head">
              <div>
                <p className="record-label">Payroll · {formatMonth(latestEcr.month)}</p>
                <h2 className="section-title">{latestEcr.filename}</h2>
              </div>
              <span className={`status-badge ${ECR_STATE_TONE[latestEcr.state]}`}>
                <FileTextIcon size={14} weight="fill" aria-hidden="true" />
                {humanizeState(latestEcr.state)}
              </span>
            </div>
            <dl className="ecr-summary__stats">
              <div><dt>Ready rows</dt><dd className="tabular">{ecrRowCounts.ready}</dd></div>
              <div><dt>Rows with issues</dt><dd className={ecrRowCounts.issue > 0 ? "tabular ecr-summary__stat--attention" : "tabular"}>{ecrRowCounts.issue}</dd></div>
              <div><dt>Excluded</dt><dd className="tabular">{ecrRowCounts.excluded}</dd></div>
              <div><dt>Total contribution</dt><dd className="tabular">{formatCurrency(latestEcr.totalContributionPaise)}</dd></div>
            </dl>
            <Link href={`/employer/ecr/${latestEcr.id}`} className="text-link text-link--flush">
              {latestEcr.state === "VALIDATION_FAILED" ? "Resolve issues and file ECR" : "Open ECR filing"}
              <ArrowRightIcon size={16} aria-hidden="true" />
            </Link>
          </div>
        ) : null}

        <div className="member-impact panel">
          <div className="member-impact__head">
            <UsersIcon size={19} weight="fill" className="text-[var(--accent)]" aria-hidden="true" />
            <div>
              <p className="record-label">Member impact</p>
              <h2 className="section-title">{snapshot.member.name}</h2>
            </div>
          </div>
          <p className="member-impact__body">
            This establishment holds one linked synthetic member record. Employer actions here update {snapshot.member.name.split(" ")[0]}&apos;s shared PF balance and passbook directly.
          </p>
          <dl className="member-impact__facts">
            <div><dt>PF balance at this establishment</dt><dd className="tabular">{sharedEmployment ? formatCurrency(sharedEmployment.pfBalancePaise) : "Not linked"}</dd></div>
            <div><dt>Last contribution posted</dt><dd className="tabular">{latestContribution ? formatMonth(latestContribution.month) : "None recorded"}</dd></div>
          </dl>
        </div>
      </section>

      <section className="employer-queue">
        <div className="section-heading-row"><div><p className="record-label">Priority queue</p><h2 className="section-title">Requests needing attention</h2></div><Link href="/employer/requests" className="text-link text-link--flush">View all requests <ArrowRightIcon size={16} aria-hidden="true" /></Link></div>
        {actionable.length === 0 ? (
          <p className="employer-empty panel">Nothing needs employer attention right now. New member requests will appear here.</p>
        ) : (
          <div className="request-table panel" aria-label="Requests needing employer attention">
            <div className="request-table__head" aria-hidden="true"><span>Member</span><span>Request</span><span>Journey</span><span>Submitted</span><span>Status</span><span>Action</span></div>
            {actionable.map((request) => (
              <Link key={request.id} href={`/employer/requests/${request.id}`} className="request-row link-row">
                <div data-label="Member"><strong>{request.memberName}</strong><small>{request.id}</small></div>
                <div data-label="Request"><strong>{request.title}</strong></div>
                <div data-label="Journey"><span>{request.relatedJourney}</span></div>
                <div data-label="Submitted"><span className="tabular">{formatDateTime(request.submittedAt)}</span></div>
                <div data-label="Status"><StatusBadge status={request.status} /></div>
                <span className="request-cell-action"><ArrowRightIcon size={17} aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="employer-queue">
        <div className="section-heading-row"><div><p className="record-label">History</p><h2 className="section-title">Recent decisions</h2></div><Link href="/employer/requests?status=processed" className="text-link text-link--flush">View all decisions <ArrowRightIcon size={16} aria-hidden="true" /></Link></div>
        {processed.length === 0 ? (
          <p className="employer-empty panel">No requests have been decided yet.</p>
        ) : (
          <ul className="decisions-ledger panel">
            {processed.slice(0, 4).map((request) => (
              <li key={request.id}>
                <Link href={`/employer/requests/${request.id}`} className="decisions-ledger__row link-row">
                  <StatusBadge status={request.status} />
                  <span className="decisions-ledger__body">
                    <strong>{request.title}</strong>
                    <small>{request.memberName} · {formatDateTime(request.updatedAt)}</small>
                  </span>
                  <ArrowRightIcon size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PrototypeNotice compact />
    </div>
  );
}
