import { ArrowRightIcon, CheckCircleIcon, ClockIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { epfoService } from "@/application/service-instance";
import { LinkButton, PrototypeNotice, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDateTime, humanizeState } from "@/lib/format";

export default function HomePage() {
  const snapshot = epfoService.getSnapshot();
  const lastEmployment = snapshot.member.employments.at(-1)!;
  const activeIssues = snapshot.issues.filter((issue) => issue.status !== "RESOLVED");
  const recentEvents = snapshot.auditEvents.slice(-3).toReversed();

  return (
    <div className="page-shell">
      <header className="home-heading">
        <div>
          <p className="eyebrow">Member home</p>
          <h1>Good afternoon, Aarav.</h1>
          <p>Here is your PF position, what needs attention, and the next useful action.</p>
        </div>
        <LinkButton href="/withdraw">Start a claim</LinkButton>
      </header>

      <section className="home-overview" aria-label="PF overview">
        <article className="balance-block">
          <p className="record-label">Available PF balance</p>
          <p className="balance-value tabular">{formatCurrency(snapshot.member.currentPfBalancePaise)}</p>
          <dl className="balance-facts">
            <div><dt>Member records</dt><dd>{snapshot.member.employments.length} under one UAN</dd></div>
            <div><dt>Last employer</dt><dd>{lastEmployment.employerName}</dd></div>
            <div><dt>Employment status</dt><dd>Not currently PF-covered</dd></div>
          </dl>
          <Link href="/member" className="text-link">View service history <ArrowRightIcon size={16} aria-hidden="true" /></Link>
        </article>

        <article className="attention-block panel">
          <div className="section-heading-row">
            <div><p className="record-label">Claim readiness</p><h2 className="section-title">Needs your attention</h2></div>
            <p className="readiness-count tabular"><strong>{snapshot.readiness.passedCount}</strong> of {snapshot.readiness.totalChecks} checks passed</p>
          </div>
          <div className="attention-list">
            {activeIssues.map((issue) => (
              <Link key={issue.id} href={`/issues/${issue.id}`} className="attention-row link-row">
                <WarningCircleIcon size={20} weight="fill" aria-hidden="true" />
                <span><strong>{issue.title}</strong><small>{issue.userAction}</small></span>
                <StatusBadge status={issue.status} />
              </Link>
            ))}
          </div>
          <Link href="/withdraw/preflight" className="text-link">Review all seven checks <ArrowRightIcon size={16} aria-hidden="true" /></Link>
        </article>
      </section>

      <section className="home-actions">
        <div className="section-heading-row">
          <div><p className="record-label">Common tasks</p><h2 className="section-title">What would you like to do?</h2></div>
        </div>
        <div className="action-directory panel">
          {[
            ["Withdraw my PF", "Check eligibility before starting Form 19", "/withdraw"],
            ["Manage my records", "Update employment and account details", "/manage"],
            ["Track my claim", "See responsibility and next steps", `/claims/${snapshot.claim.id}`],
            ["Transfer PF", "Review transfer services after changing jobs", "/online-services"],
          ].map(([title, description, href]) => (
            <Link key={title} href={href} className="directory-row link-row">
              <span><strong>{title}</strong><small>{description}</small></span><ArrowRightIcon size={18} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className="activity-section">
        <div><p className="record-label">Account log</p><h2 className="section-title">Recent activity</h2></div>
        <div className="activity-list panel">
          {recentEvents.map((event) => (
            <div key={event.id} className="activity-row">
              {event.eventType.includes("RESOLVED") || event.eventType.includes("APPROVED") ? <CheckCircleIcon size={18} weight="fill" className="text-[var(--success)]" aria-hidden="true" /> : <ClockIcon size={18} weight="fill" className="text-[var(--info)]" aria-hidden="true" />}
              <span><strong>{humanizeState(event.eventType)}</strong><small>{event.actorName}</small></span>
              <time dateTime={event.timestamp}>{formatDateTime(event.timestamp)}</time>
            </div>
          ))}
        </div>
      </section>

      <PrototypeNotice compact />
    </div>
  );
}
