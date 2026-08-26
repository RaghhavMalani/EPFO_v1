import {
  ArrowRightIcon,
  CheckCircleIcon,
  UserFocusIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { epfoService } from "@/application/service-instance";
import { LinkButton, PageHeader, StatusBadge } from "@/components/ui";
import type { PreflightCheck } from "@/domain/schemas";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Claim Preflight" };

function ReadyCheck({ check }: { check: PreflightCheck }) {
  return (
    <div className="grid grid-cols-[1.75rem_1fr] gap-3 py-4">
      <CheckCircleIcon
        size={21}
        weight="fill"
        className="mt-0.5 text-[var(--success)]"
        aria-hidden="true"
      />
      <div>
        <p className="font-semibold">{check.label}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{check.userExplanation}</p>
      </div>
    </div>
  );
}

function AttentionCheck({ check }: { check: PreflightCheck }) {
  return (
    <article className="rounded-2xl border border-[var(--warning)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <WarningCircleIcon
          size={24}
          weight="fill"
          className="mt-0.5 shrink-0 text-[var(--warning)]"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-[-0.015em]">{check.label}</h3>
            <StatusBadge status={check.status} />
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{check.userExplanation}</p>
          <dl className="mt-5 grid gap-4 border-t border-[var(--line)] pt-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold text-[var(--muted)]">Responsible</dt>
              <dd className="mt-1 text-sm font-semibold">{check.responsibleParty}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[var(--muted)]">Recommended action</dt>
              <dd className="mt-1 text-sm font-semibold">{check.recommendedAction}</dd>
            </div>
          </dl>
          {check.issueId ? (
            <Link
              href={`/issues/${check.issueId}`}
              className="mt-5 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-[var(--accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              See how to fix this
              <ArrowRightIcon size={17} aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function PreflightPage() {
  const snapshot = epfoService.getSnapshot();
  const readyChecks = snapshot.preflight.filter((check) => check.status === "PASS");
  const attentionChecks = snapshot.preflight.filter((check) => check.status !== "PASS");
  const title = snapshot.readiness.isReady
    ? "You're ready to claim."
    : "Let's check your claim before you file.";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        title={title}
        description={
          snapshot.readiness.isReady
            ? "Every deterministic check has passed. Review the synthetic withdrawal before you submit it."
            : "Claim Preflight shows what passed, what needs attention, and exactly who can fix it."
        }
        backHref="/withdraw"
        backLabel="Withdrawal details"
      />

      <section className="grid gap-5 py-9 md:grid-cols-[0.72fr_1.28fr]">
        <div className="rounded-2xl bg-[var(--accent-fill)] p-6 text-white sm:p-7">
          <p className="text-sm font-medium text-white/75">Claim readiness</p>
          <p className="mt-2 text-6xl font-semibold tracking-[-0.055em]">
            {snapshot.readiness.percentage}%
          </p>
          <p className="mt-5 text-sm leading-6 text-white/80">
            {snapshot.readiness.attentionCount === 0
              ? "No items need attention."
              : `${snapshot.readiness.attentionCount} ${snapshot.readiness.attentionCount === 1 ? "thing needs" : "things need"} attention.`}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-7">
          <div className="flex gap-3">
            <UserFocusIcon size={25} className="shrink-0 text-[var(--accent)]" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">A score you can explain</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Readiness is calculated from seven deterministic checks. It changes only when the underlying synthetic records change.
              </p>
            </div>
          </div>
        </div>
      </section>

      {attentionChecks.length > 0 ? (
        <section className="py-5">
          <h2 className="text-2xl font-semibold tracking-[-0.025em]">Needs attention</h2>
          <div className="mt-5 space-y-4">
            {attentionChecks.map((check) => (
              <AttentionCheck key={check.id} check={check} />
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-[var(--success)] bg-[var(--success-soft)] p-6 sm:p-8">
          <CheckCircleIcon size={30} weight="fill" className="text-[var(--success)]" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.025em]">All preflight checks passed</h2>
          <p className="mt-2 max-w-xl leading-7 text-[var(--muted)]">
            The synthetic employment records, identity checks, bank destination, and requested amount are ready.
          </p>
          <div className="mt-6">
            <LinkButton href="/withdraw/review">
              Review {formatCurrency(snapshot.member.requestedWithdrawalPaise)} withdrawal
            </LinkButton>
          </div>
        </section>
      )}

      <section className="mt-10 py-5">
        <h2 className="text-2xl font-semibold tracking-[-0.025em]">Ready</h2>
        <div className="mt-4 grid gap-x-8 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 md:grid-cols-2 md:px-6">
          {readyChecks.map((check) => (
            <ReadyCheck key={check.id} check={check} />
          ))}
        </div>
      </section>
    </div>
  );
}
