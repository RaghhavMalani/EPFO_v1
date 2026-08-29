import { ArrowRightIcon, CheckCircleIcon, ClockIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { epfoService } from "@/application/service-instance";
import { PageHeader, PrototypeNotice, StatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Employer operations" };

export default function EmployerPage() {
  const snapshot = epfoService.getSnapshot();
  const actionable = snapshot.employerRequests.filter((request) => request.status === "AWAITING_REVIEW" || request.status === "IN_REVIEW");
  const processed = snapshot.employerRequests.filter((request) => request.status === "APPROVED" || request.status === "REJECTED");
  const waiting = snapshot.employerRequests.filter((request) => request.status === "INFORMATION_REQUESTED");
  return (
    <div className="page-shell employer-page">
      <PageHeader eyebrow="Employer overview" title="Operations overview" description="Review member-record changes, act on the oldest requests first, and keep every decision traceable." />
      <section className="queue-metrics panel" aria-label="Request queue summary">
        <div><ClockIcon size={18} weight="fill" aria-hidden="true" /><span>Need action</span><strong className="tabular">{actionable.length}</strong></div>
        <div><WarningCircleIcon size={18} weight="fill" aria-hidden="true" /><span>Waiting on member</span><strong className="tabular">{waiting.length}</strong></div>
        <div><CheckCircleIcon size={18} weight="fill" aria-hidden="true" /><span>Processed</span><strong className="tabular">{processed.length}</strong></div>
        <div><span>Establishment</span><strong>{snapshot.employer.establishmentIdMasked}</strong><small>{snapshot.employer.pfOffice}</small></div>
      </section>

      <section className="employer-queue">
        <div className="section-heading-row"><div><p className="record-label">Priority queue</p><h2 className="section-title">Requests needing attention</h2></div><Link href="/employer/requests" className="text-link text-link--flush">View all requests <ArrowRightIcon size={16} aria-hidden="true" /></Link></div>
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
      </section>
      <PrototypeNotice compact />
    </div>
  );
}
