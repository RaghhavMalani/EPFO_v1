import {
  ArrowRightIcon,
  ArrowsLeftRightIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  PiggyBankIcon,
  WrenchIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { epfoService } from "@/application/service-instance";
import { PrototypeNotice, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDateTime, humanizeState } from "@/lib/format";

const quickGoals = [
  { href: "/withdraw", label: "Withdraw my PF", Icon: PiggyBankIcon },
  { href: "/online-services", label: "I changed jobs", Icon: ArrowsLeftRightIcon },
  { href: "/claims/claim-demo-001", label: "Track a claim", Icon: MagnifyingGlassIcon },
  { href: "/manage", label: "Manage my account", Icon: WrenchIcon },
];

export default function HomePage() {
  const snapshot = epfoService.getSnapshot();
  const lastEmployment = snapshot.member.employments.at(-1)!;
  const activeIssues = snapshot.issues.filter((issue) => issue.status !== "RESOLVED");
  const currentRequest = snapshot.employerRequests.find((request) => request.memberId === snapshot.member.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <section className="grid gap-8 border-b border-[var(--line)] pb-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Member home</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Good afternoon, Aarav.</h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-[var(--muted)]">
            Your PF view brings one masked UAN, three member records, services, and requests into one guided workspace.
          </p>
        </div>
        <div className="rounded-2xl bg-[var(--accent-fill)] p-6 text-white sm:p-7">
          <p className="text-sm text-white/75">Total synthetic PF balance</p>
          <p className="mt-2 text-4xl font-semibold tracking-[-0.04em]">{formatCurrency(snapshot.member.currentPfBalancePaise)}</p>
          <div className="mt-5 flex items-center gap-2 text-sm text-white/80">
            <BriefcaseIcon size={18} aria-hidden="true" />
            <span>Last employer: {lastEmployment.employerName}</span>
          </div>
          <p className="mt-2 text-sm font-medium text-white">Not currently employed in a PF-covered establishment</p>
        </div>
      </section>

      <section className="grid gap-5 py-9 lg:grid-cols-[0.82fr_1.18fr]">
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-7">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-[var(--muted)]">Account health</p>
              <p className="mt-2 text-5xl font-semibold tracking-[-0.05em]">{snapshot.readiness.percentage}%</p>
              <p className="mt-2 text-sm font-semibold">{snapshot.readiness.passedCount} of {snapshot.readiness.totalChecks} checks ready</p>
            </div>
            <span className="grid size-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <CheckCircleIcon size={24} weight="fill" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]" aria-hidden="true">
            <div className="h-full rounded-full bg-[var(--accent-fill)]" style={{ width: `${snapshot.readiness.percentage}%` }} />
          </div>
          <Link href="/withdraw/preflight" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:underline">
            View all seven checks <ArrowRightIcon size={17} aria-hidden="true" />
          </Link>
        </article>

        <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Active requests</h2>
            <span className="text-sm text-[var(--muted)]">{activeIssues.length} need action</span>
          </div>
          <div className="mt-5 divide-y divide-[var(--line)]">
            {activeIssues.map((issue) => (
              <Link key={issue.id} href={`/issues/${issue.id}`} className="grid gap-3 py-4 first:pt-0 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-semibold">{issue.title}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Next: {issue.userAction}</p>
                </div>
                <StatusBadge status={issue.status} />
              </Link>
            ))}
            {currentRequest ? (
              <Link href={`/employer/requests/${currentRequest.id}`} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-semibold">Employer review: {currentRequest.title}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Responsible: Demo Systems Pvt Ltd</p>
                </div>
                <StatusBadge status={currentRequest.status} />
              </Link>
            ) : null}
          </div>
        </article>
      </section>

      <section className="py-6">
        <h2 className="text-2xl font-semibold tracking-[-0.025em]">Quick goals</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickGoals.map(({ href, label, Icon }) => (
            <Link key={label} href={href} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-[var(--line-strong)]">
              <Icon size={24} className="text-[var(--accent)]" aria-hidden="true" />
              <p className="mt-5 font-semibold">{label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-5 py-9 lg:grid-cols-2">
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-xl font-semibold">Claim activity</h2>
          <Link href={`/claims/${snapshot.claim.id}`} className="mt-5 flex items-start justify-between gap-4 rounded-xl bg-[var(--surface-muted)] p-4">
            <div>
              <p className="font-semibold">Final PF settlement · Form 19</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{formatCurrency(snapshot.claim.requestedAmountPaise)} · {humanizeState(snapshot.claim.state)}</p>
            </div>
            <ClockIcon size={21} className="text-[var(--accent)]" aria-hidden="true" />
          </Link>
        </article>
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-xl font-semibold">Recent account activity</h2>
          {snapshot.auditEvents.slice(-2).toReversed().map((event) => (
            <div key={event.id} className="mt-4 border-t border-[var(--line)] pt-4 first:border-0 first:pt-0">
              <p className="text-sm font-semibold">{humanizeState(event.eventType)}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{event.actorName} · {formatDateTime(event.timestamp)}</p>
            </div>
          ))}
        </article>
      </section>

      <PrototypeNotice compact />
    </div>
  );
}
