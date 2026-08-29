import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { epfoService, experienceV2Service } from "@/application/service-instance";
import { LinkButton, PrototypeNotice } from "@/components/ui";
import { buildMemberActivity, type ActivityTone } from "@/domain/activity-feed";
import { contributionStatusLabel, selectPassbookHighlights } from "@/domain/contribution-health";
import { T } from "@/lib/i18n/t";
import { formatAmount, formatCurrency, formatDateTime, formatMonth } from "@/lib/format";

const PF_SERVICES = [
  { title: "Withdraw PF", detail: "Final settlement under Form 19", href: "/withdraw" },
  { title: "Take an advance", detail: "Partial withdrawal for a specific purpose", href: "/advance" },
  { title: "Transfer PF", detail: "Consolidate a previous PF account", href: "/transfer" },
  { title: "Plan for retirement", detail: "Pension estimate and corpus projection", href: "/pension" },
];

const ACCOUNT_SERVICES = [
  { title: "Service history", detail: "Every employment record under this UAN", href: "/member" },
  { title: "Manage records", detail: "Exit dates, profile and account details", href: "/manage" },
];

const TONE_ICON: Record<ActivityTone, typeof CheckCircleIcon> = {
  attention: WarningCircleIcon,
  progress: ClockIcon,
  complete: CheckCircleIcon,
};

export default function HomePage() {
  const snapshot = epfoService.getSnapshot();
  const passbook = experienceV2Service.getPassbook();
  const highlights = selectPassbookHighlights(passbook);
  const activity = buildMemberActivity(snapshot, 4);
  const activeIssues = snapshot.issues.filter((issue) => issue.status !== "RESOLVED");
  const lastEmployment = snapshot.member.employments.at(-1)!;
  const latestMonth = passbook.months.at(-1);
  const { readiness } = snapshot;

  return (
    <div className="page-shell">
      <header className="home-masthead">
        <div>
          <h1>Good afternoon, {snapshot.member.name.split(" ")[0]}.</h1>
          <p><T id="home.subtitle" /></p>
        </div>
        <LinkButton href="/online-services"><T id="home.openServices" /></LinkButton>
      </header>

      <section className="account-band" aria-label="Provident fund position">
        <div className="account-band__balance">
          <p className="record-label">Available PF balance</p>
          <p className="balance-value tabular">{formatCurrency(snapshot.member.currentPfBalancePaise)}</p>
          <dl className="account-facts">
            <div>
              <dt>Member records</dt>
              <dd>{snapshot.member.employments.length} under one UAN</dd>
            </div>
            <div>
              <dt>Last employer</dt>
              <dd>{lastEmployment.employerName}</dd>
            </div>
            <div>
              <dt>Employment status</dt>
              <dd>Not currently PF-covered</dd>
            </div>
            <div>
              <dt>Last contribution</dt>
              <dd>{latestMonth ? formatMonth(latestMonth.contribution.month) : "None recorded"}</dd>
            </div>
          </dl>
        </div>

        <div className="readiness-card state-enter" key={readiness.passedCount}>
          <div className="readiness-card__head">
            <h2><T id="home.readinessHeading" /></h2>
            <p className="tabular">
              <strong>{readiness.passedCount}</strong>
              <span>of {readiness.totalChecks} checks</span>
            </p>
          </div>
          <ol className="readiness-issues">
            {activeIssues.map((issue) => (
              <li key={issue.id}>
                <Link href={`/issues/${issue.id}`} className="readiness-issue link-row">
                  <WarningCircleIcon size={18} weight="fill" aria-hidden="true" />
                  <span>
                    <strong>{issue.title}</strong>
                    <small>{issue.userAction}</small>
                  </span>
                  <ArrowRightIcon size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
          <Link href="/withdraw/preflight" className="text-link">
            Review all {readiness.totalChecks} checks
            <ArrowRightIcon size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="home-section" aria-labelledby="contributions-heading">
        <div className="home-section__head">
          <h2 id="contributions-heading"><T id="home.contributionsHeading" /></h2>
          <Link href="/passbook" className="text-link text-link--flush">
            View passbook
            <ArrowRightIcon size={16} aria-hidden="true" />
          </Link>
        </div>
        <ul className="mini-ledger">
          {highlights.map(({ contribution, health }) => {
            const attention = health.status !== "POSTED" && health.status !== "RECONCILED";
            return (
              <li key={contribution.id} className={attention ? "mini-ledger__row mini-ledger__row--attention" : "mini-ledger__row"}>
                <span className="mini-ledger__month">{formatMonth(contribution.month)}</span>
                <span className="mini-ledger__employer">{contribution.employerName}</span>
                <span className="mini-ledger__wage tabular">Wage ₹{formatAmount(contribution.wageBasisPaise)}</span>
                <span className="mini-ledger__amount tabular">₹{formatAmount(health.recordedTotalPaise)}</span>
                <span className={attention ? "ledger-status ledger-status--attention" : "ledger-status"}>
                  {contributionStatusLabel(health.status)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="home-section" aria-labelledby="services-heading">
        <div className="home-section__head">
          <h2 id="services-heading"><T id="home.servicesHeading" /></h2>
        </div>
        <div className="service-directory">
          <ul>
            {PF_SERVICES.map((service) => (
              <li key={service.title}>
                <Link href={service.href} className="ledger-link link-row">
                  <span>
                    <strong>{service.title}</strong>
                    <small>{service.detail}</small>
                  </span>
                  <ArrowRightIcon size={17} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <p className="service-directory__label">Account and employment</p>
          <ul>
            {ACCOUNT_SERVICES.map((service) => (
              <li key={service.title}>
                <Link href={service.href} className="ledger-link link-row">
                  <span>
                    <strong>{service.title}</strong>
                    <small>{service.detail}</small>
                  </span>
                  <ArrowRightIcon size={17} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="home-section" aria-labelledby="activity-heading">
        <div className="home-section__head">
          <h2 id="activity-heading"><T id="home.activityHeading" /></h2>
          <Link href="/activity" className="text-link text-link--flush">
            View all activity
            <ArrowRightIcon size={16} aria-hidden="true" />
          </Link>
        </div>
        <ul className="activity-ledger">
          {activity.map((entry) => {
            const Icon = TONE_ICON[entry.tone];
            const body = (
              <>
                <Icon size={17} weight="fill" aria-hidden="true" />
                <span>
                  <strong>{entry.title}</strong>
                  <small>{entry.detail}</small>
                </span>
                <time dateTime={entry.timestamp} className="tabular">{formatDateTime(entry.timestamp)}</time>
              </>
            );
            return (
              <li key={entry.id} className={`activity-entry activity-entry--${entry.tone}`}>
                {entry.href ? (
                  <Link href={entry.href} className="activity-entry__body link-row">{body}</Link>
                ) : (
                  <div className="activity-entry__body">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <PrototypeNotice compact />
    </div>
  );
}
