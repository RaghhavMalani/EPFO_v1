import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { epfoService } from "@/application/service-instance";
import { PageHeader, StatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Employer requests" };

export default async function EmployerRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const snapshot = epfoService.getSnapshot();
  const { status = "all" } = await searchParams;
  const actionable = snapshot.employerRequests.filter((request) => request.status === "AWAITING_REVIEW" || request.status === "IN_REVIEW").length;
  const filteredRequests = snapshot.employerRequests.filter((request) => {
    if (status === "action") return request.status === "AWAITING_REVIEW" || request.status === "IN_REVIEW";
    if (status === "processed") return request.status === "APPROVED" || request.status === "REJECTED";
    return true;
  });
  return (
    <div className="page-shell employer-page">
      <PageHeader eyebrow="Requests" title="Member requests" description="Compare records, assess the related member journey, and record a traceable decision." backHref="/employer" backLabel="Employer overview" aside={<p className="queue-total"><strong className="tabular">{actionable}</strong><span>need action</span></p>} />
      <div className="queue-toolbar" aria-label="Queue filters">
        <div className="queue-filters">
          {[["all", "All"], ["action", "Needs action"], ["processed", "Processed"]].map(([value, label]) => <Link key={value} href={value === "all" ? "/employer/requests" : `/employer/requests?status=${value}`} className={status === value ? "queue-filter queue-filter--active" : "queue-filter"} aria-current={status === value ? "page" : undefined}>{label}</Link>)}
        </div>
        <p>{filteredRequests.length} shown · Oldest actionable first</p>
      </div>
      <section className="request-table request-table--full panel" aria-label="Member request queue">
        <div className="request-table__head" aria-hidden="true"><span>Member</span><span>Request</span><span>Journey</span><span>Submitted</span><span>Status</span><span>Action</span></div>
        {filteredRequests.map((request) => (
          <Link key={request.id} href={`/employer/requests/${request.id}`} className="request-row link-row">
            <div data-label="Member"><strong>{request.memberName}</strong><small>{request.id}</small></div>
            <div data-label="Request"><strong>{request.title}</strong><small>{request.requestType.replaceAll("_", " ").toLowerCase()}</small></div>
            <div data-label="Journey"><span>{request.relatedJourney}</span></div>
            <div data-label="Submitted"><span className="tabular">{formatDateTime(request.submittedAt)}</span></div>
            <div data-label="Status"><StatusBadge status={request.status} /></div>
            <div className="request-action">Review <ArrowRightIcon size={15} aria-hidden="true" /></div>
          </Link>
        ))}
      </section>
    </div>
  );
}
