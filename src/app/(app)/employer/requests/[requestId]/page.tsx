import { ArrowRightIcon, CheckCircleIcon, InfoIcon } from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";
import { loadSession } from "@/application/session";
import { ActionButton } from "@/components/action-button";
import { EmployerDecisionForm } from "@/components/employer-decision-form";
import { PageHeader, PrototypeNotice, StatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Employer request detail" };

export default async function EmployerRequestPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const { epfoService } = await loadSession();
  const snapshot = epfoService.getSnapshot();
  const request = snapshot.employerRequests.find((candidate) => candidate.id === requestId);
  if (!request) notFound();
  const fields = Array.from(new Set([...Object.keys(request.currentRecord), ...Object.keys(request.proposedRecord)]));

  return (
    <div className="page-shell employer-page">
      <PageHeader eyebrow={`Request ${request.id}`} title={request.title} description={`${request.memberName} · Related journey: ${request.relatedJourney}`} backHref="/employer/requests" backLabel="Member requests" aside={<StatusBadge status={request.status} />} />

      <section className="request-context panel">
        <div><span>Member</span><strong>{request.memberName}</strong></div>
        <div><span>Submitted</span><strong className="tabular">{formatDateTime(request.submittedAt)}</strong></div>
        <div><span>Request type</span><strong>{request.requestType.replaceAll("_", " ").toLowerCase()}</strong></div>
        <div><span>Current owner</span><strong>{request.status === "INFORMATION_REQUESTED" ? request.memberName : snapshot.employer.name}</strong></div>
      </section>

      <div className="request-detail-layout">
        <div className="request-detail-main">
          <section>
            <div><p className="record-label">Record comparison</p><h2 className="section-title">Current and proposed details</h2></div>
            <div className="comparison-table panel">
              <div className="comparison-head"><span>Field</span><span>Current details</span><span>Proposed details</span></div>
              {fields.map((field) => (
                <div key={field} className="comparison-row"><strong>{field}</strong><span>{request.currentRecord[field] ?? "Not recorded"}</span><span>{request.proposedRecord[field] ?? "No change"}</span></div>
              ))}
            </div>
          </section>

          <section className="impact-panel panel">
            <InfoIcon size={19} weight="fill" aria-hidden="true" />
            <div><h2>Impact and supporting context</h2><p>{request.whyItMatters}</p><ul>{request.supportingContext.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </section>

          {request.status === "IN_REVIEW" ? <section className="decision-panel panel"><div><p className="record-label">Decision</p><h2 className="section-title">Record your decision</h2><p>Approval updates the shared member record. A request for information or rejection requires a member-visible reason.</p></div><EmployerDecisionForm requestId={request.id} /></section> : null}
          {request.status === "APPROVED" ? <section className="approved-panel state-enter"><CheckCircleIcon size={20} weight="fill" aria-hidden="true" /><div><strong>Approved and applied</strong><p>The member record was updated and Claim Preflight reran automatically.</p></div></section> : null}
        </div>

        <aside className="request-detail-side">
          <section className="panel request-action-panel"><p className="record-label">Required employer action</p>{request.status === "AWAITING_REVIEW" ? <><h2>Begin assessment</h2><p>Opening review records that this establishment is now assessing the proposed change.</p><ActionButton endpoint={`/api/employer/requests/${request.id}`} body={{ action: "START_REVIEW" }} className="mt-5" showArrow>Start review</ActionButton></> : <><h2>{request.status === "IN_REVIEW" ? "Decision required" : "No action available"}</h2><p>{request.status === "INFORMATION_REQUESTED" ? "Waiting for the member to supply synthetic context." : request.status === "REJECTED" ? `Rejected: ${request.reason}` : request.status === "APPROVED" ? "This request is complete." : "Compare the values and record a decision below."}</p></>}</section>
          <section className="panel request-history"><p className="record-label">Audit trail</p><h2>Request history</h2>{request.events.toReversed().map((event) => <div key={event.id}><ArrowRightIcon size={15} aria-hidden="true" /><p><strong>{event.note}</strong><span>{event.actorName} · {formatDateTime(event.timestamp)}</span></p></div>)}</section>
        </aside>
      </div>
      <PrototypeNotice compact />
    </div>
  );
}
