import { InfoIcon } from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";
import { epfoService } from "@/application/service-instance";
import { ActionButton } from "@/components/action-button";
import { Definition, LinkButton, PageHeader, StatusBadge } from "@/components/ui";
import type { EmployerRequest, Issue } from "@/domain/schemas";
import { formatDateTime, humanizeState } from "@/lib/format";

export const metadata = { title: "Resolve account issue" };

function ActionPanel({ issue, request }: { issue: Issue; request?: EmployerRequest }) {
  if (issue.status === "RESOLVED") {
    return <div className="rounded-2xl border border-[var(--success)] bg-[var(--success-soft)] p-6"><p className="font-semibold text-[var(--success)]">Underlying record corrected</p><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Claim Preflight automatically reran against the shared synthetic record.</p><div className="mt-5"><LinkButton href="/withdraw/preflight">Return to Claim Preflight</LinkButton></div></div>;
  }
  if (issue.type === "MISSING_EXIT_DATE") {
    return <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6"><p className="font-semibold">Member action available now</p><p className="mt-2 text-sm leading-6 text-[var(--muted)]">The 60-day waiting period has passed. Review and confirm the synthetic Date of Exit in Manage.</p><div className="mt-5"><LinkButton href="/manage/mark-exit">Open Mark Exit</LinkButton></div></div>;
  }
  if (!request) {
    return <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6"><p className="font-semibold">Create employer review request</p><p className="mt-2 text-sm leading-6 text-[var(--muted)]">The proposed legacy record correction needs Demo Systems to review it.</p><ActionButton endpoint={`/api/actions/issues/${issue.id}`} body={{ action: "CREATE_EMPLOYER_REQUEST" }} className="mt-5" showArrow>Send synthetic request</ActionButton></div>;
  }
  if (request.status === "INFORMATION_REQUESTED") {
    return <div className="rounded-2xl border border-[var(--warning)] bg-[var(--warning-soft)] p-6"><p className="font-semibold">Employer requested information</p><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Reason: {request.reason}</p><ActionButton endpoint={`/api/actions/issues/${issue.id}`} body={{ action: "RESUBMIT_EMPLOYER_REQUEST" }} className="mt-5" showArrow>Supply synthetic context and resubmit</ActionButton></div>;
  }
  return <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6"><p className="font-semibold">Current request: {humanizeState(request.status)}</p><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{request.status === "REJECTED" ? `Employer reason: ${request.reason}` : "Demo Systems is the current responsible party. No member action is required until its decision."}</p><div className="mt-5"><LinkButton href={`/employer/requests/${request.id}`} variant="secondary">View shared request</LinkButton></div></div>;
}

export default async function IssuePage({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params;
  const snapshot = epfoService.getSnapshot();
  const issue = snapshot.issues.find((candidate) => candidate.id === issueId);
  if (!issue) notFound();
  const route = snapshot.issueResolutions.find((candidate) => candidate.issueId === issue.id)!;
  const request = snapshot.employerRequests.find((candidate) => candidate.issueId === issue.id);
  const currentActor = request && ["AWAITING_REVIEW", "IN_REVIEW"].includes(request.status) ? snapshot.employer.name : route.responsibleParty;
  const nextAction = issue.status === "RESOLVED" ? "Return to Claim Preflight." : request?.status === "INFORMATION_REQUESTED" ? "Supply synthetic context and resubmit." : route.requiredAction;

  return (
    <div className="page-shell page-shell--narrow">
      <PageHeader eyebrow="Readiness issue" title={issue.title} description={issue.description} backHref="/withdraw/preflight" backLabel="Claim Preflight" aside={<StatusBadge status={issue.status} />} />
      <section className="issue-route panel">
        <div><p>Resolution route</p><strong>{humanizeState(route.resolutionType)}</strong></div>
        <div><p>Who is acting now</p><strong>{currentActor}</strong></div>
        <div><p>Member action now</p><strong>{issue.status === "WAITING_EXTERNAL" ? "Nothing required" : issue.userAction}</strong></div>
        <div><p>What happens next</p><strong>{nextAction}</strong></div>
      </section>
      <div className="grid gap-8 py-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-[var(--warning)] bg-[var(--warning-soft)] p-6 sm:p-7"><InfoIcon size={25} weight="fill" className="text-[var(--warning)]" aria-hidden="true" /><h2 className="mt-4 text-xl font-semibold">What is wrong</h2><p className="mt-3 leading-7 text-[var(--muted)]">{issue.description}</p><h3 className="mt-6 font-semibold">Why it matters</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{issue.whyItMatters}</p></section>
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6"><h2 className="text-xl font-semibold">Routing decision</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{route.explanation}</p><dl className="mt-5 grid gap-5 border-t border-[var(--line)] pt-5 sm:grid-cols-2"><Definition term="Responsible party">{route.responsibleParty}</Definition><Definition term="Expected timing">{issue.expectedBy}</Definition></dl></section>
        </div>
        <aside className="space-y-5"><ActionPanel issue={issue} request={request} /><div className="rounded-2xl border border-[var(--info-line)] bg-[var(--info-soft)] p-5 text-sm leading-6 text-[var(--muted)]"><p className="font-semibold text-[var(--ink)]">Synthetic workflow</p><p className="mt-1">No real employer or EPFO request is sent. Both portal views read and update one in-memory scenario.</p></div></aside>
      </div>
      <section className="mt-9 border-t border-[var(--line)] pt-9"><h2 className="text-2xl font-semibold">Issue history</h2><div className="mt-6 space-y-4">{issue.events.toReversed().map((event) => <article key={event.id} className="grid gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={event.status} /><span className="text-sm font-semibold">{event.actorName}</span></div><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{event.note}</p></div><time className="text-xs text-[var(--muted)]" dateTime={event.timestamp}>{formatDateTime(event.timestamp)}</time></article>)}</div></section>
    </div>
  );
}
