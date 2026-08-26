import { ArrowRightIcon, CheckCircleIcon, InfoIcon } from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";
import { epfoService } from "@/application/service-instance";
import { ActionButton } from "@/components/action-button";
import { EmployerDecisionForm } from "@/components/employer-decision-form";
import { PageHeader, PrototypeNotice, StatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Employer request detail" };

export default async function EmployerRequestPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const snapshot = epfoService.getSnapshot();
  const request = snapshot.employerRequests.find((candidate) => candidate.id === requestId);
  if (!request) notFound();
  const fields = Array.from(new Set([...Object.keys(request.currentRecord), ...Object.keys(request.proposedRecord)]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader eyebrow={`Member request · ${request.memberName}`} title={request.title} description={`Related journey: ${request.relatedJourney}`} backHref="/employer/requests" backLabel="Member requests" aside={<StatusBadge status={request.status} />} />
      <div className="grid gap-8 py-9 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
            <div className="grid grid-cols-[0.8fr_1fr_1fr] gap-3 border-b border-[var(--line)] bg-[var(--surface-muted)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]"><span>Field</span><span>Current</span><span>Proposed</span></div>
            {fields.map((field) => <div key={field} className="grid grid-cols-[0.8fr_1fr_1fr] gap-3 border-b border-[var(--line)] px-5 py-4 text-sm last:border-0"><span className="font-semibold">{field}</span><span className="text-[var(--muted)]">{request.currentRecord[field] ?? "Not recorded"}</span><span className="font-semibold text-[var(--accent)]">{request.proposedRecord[field] ?? "No change"}</span></div>)}
          </section>
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6"><InfoIcon size={24} className="text-[var(--accent)]" weight="fill" aria-hidden="true" /><h2 className="mt-4 text-xl font-semibold">Impact and context</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{request.whyItMatters}</p><ul className="mt-5 space-y-2 text-sm text-[var(--muted)]">{request.supportingContext.map((item) => <li key={item}>• {item}</li>)}</ul></section>
          {request.status === "IN_REVIEW" ? <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6"><h2 className="text-xl font-semibold">Record your decision</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Approval updates the shared member record. Requesting information or rejecting requires a member-visible reason.</p><div className="mt-6"><EmployerDecisionForm requestId={request.id} /></div></section> : null}
          {request.status === "APPROVED" ? <section className="rounded-2xl border border-[var(--success)] bg-[var(--success-soft)] p-6"><CheckCircleIcon size={26} weight="fill" className="text-[var(--success)]" aria-hidden="true" /><h2 className="mt-4 font-semibold">Approved and applied</h2><p className="mt-2 text-sm text-[var(--muted)]">The member record was updated, readiness reran automatically, and the claim can continue when all seven checks pass.</p></section> : null}
        </div>
        <aside className="space-y-5">
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6"><h2 className="font-semibold">Employer action</h2>{request.status === "AWAITING_REVIEW" ? <ActionButton endpoint={`/api/employer/requests/${request.id}`} body={{ action: "START_REVIEW" }} className="mt-5" showArrow>Start review</ActionButton> : <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{request.status === "INFORMATION_REQUESTED" ? "Waiting for the member to supply synthetic context." : request.status === "REJECTED" ? `Request rejected. Reason: ${request.reason}` : request.status === "APPROVED" ? "No further employer action is required." : "Compare the values and record a decision."}</p>}</section>
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6"><h2 className="font-semibold">Request history</h2><div className="mt-5 space-y-5">{request.events.toReversed().map((event) => <div key={event.id} className="grid grid-cols-[1.25rem_1fr] gap-3"><ArrowRightIcon size={17} className="mt-0.5 text-[var(--accent)]" aria-hidden="true" /><div><p className="text-sm font-semibold">{event.note}</p><p className="mt-1 text-xs text-[var(--muted)]">{event.actorName} · {formatDateTime(event.timestamp)}</p></div></div>)}</div></section>
        </aside>
      </div>
      <PrototypeNotice compact />
    </div>
  );
}
