import { ArrowRightIcon, BuildingsIcon, CheckCircleIcon, ClockIcon, IdentificationBadgeIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { epfoService } from "@/application/service-instance";
import { LinkButton, PageHeader, PrototypeNotice, StatusBadge } from "@/components/ui";

export const metadata = { title: "Employer workspace" };

export default function EmployerPage() {
  const snapshot = epfoService.getSnapshot();
  const actionable = snapshot.employerRequests.filter((request) => request.status === "AWAITING_REVIEW" || request.status === "IN_REVIEW");
  const processed = snapshot.employerRequests.filter((request) => request.status === "APPROVED" || request.status === "REJECTED");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        eyebrow="Synthetic Employer Portal"
        title="Employer request workspace"
        description="Review member record corrections with current and proposed values, context, impact, and a traceable decision."
        aside={<LinkButton href="/" variant="secondary">Return to member</LinkButton>}
      />

      <section className="grid gap-5 py-9 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl bg-[var(--accent-fill)] p-6 text-white sm:p-8">
          <BuildingsIcon size={28} aria-hidden="true" />
          <p className="mt-5 text-sm text-white/75">Synthetic establishment</p>
          <h2 className="mt-1 text-2xl font-semibold">{snapshot.employer.name}</h2>
          <p className="mt-2 text-sm text-white/75">{snapshot.employer.establishmentIdMasked} · {snapshot.employer.pfOffice}</p>
          <div className="mt-7"><LinkButton href="/employer/requests">Continue as Demo Employer</LinkButton></div>
        </article>
        <div className="grid grid-cols-2 gap-4">
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6"><ClockIcon size={23} className="text-[var(--warning)]" aria-hidden="true" /><p className="mt-5 text-3xl font-semibold">{actionable.length}</p><p className="mt-1 text-sm text-[var(--muted)]">Need employer action</p></article>
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6"><CheckCircleIcon size={23} className="text-[var(--success)]" weight="fill" aria-hidden="true" /><p className="mt-5 text-3xl font-semibold">{processed.length}</p><p className="mt-1 text-sm text-[var(--muted)]">Processed requests</p></article>
          <article className="col-span-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6"><IdentificationBadgeIcon size={23} className="text-[var(--accent)]" aria-hidden="true" /><p className="mt-4 font-semibold">No real employer credentials</p><p className="mt-1 text-sm leading-6 text-[var(--muted)]">This role switch opens a synthetic workflow only. It does not authenticate with EPFO.</p></article>
        </div>
      </section>

      <section className="py-6">
        <div className="flex items-end justify-between gap-4"><div><h2 className="text-2xl font-semibold">Requests needing attention</h2><p className="mt-2 text-sm text-[var(--muted)]">Oldest requests appear first.</p></div><Link href="/employer/requests" className="text-sm font-semibold text-[var(--accent)] hover:underline">View all</Link></div>
        <div className="mt-5 space-y-3">
          {actionable.map((request) => <Link key={request.id} href={`/employer/requests/${request.id}`} className="grid gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-semibold">{request.memberName} · {request.title}</p><p className="mt-1 text-sm text-[var(--muted)]">Impact: {request.relatedJourney}</p></div><div className="flex items-center gap-3"><StatusBadge status={request.status} /><ArrowRightIcon size={18} className="text-[var(--accent)]" aria-hidden="true" /></div></Link>)}
        </div>
      </section>
      <div className="mt-9"><PrototypeNotice compact /></div>
    </div>
  );
}
