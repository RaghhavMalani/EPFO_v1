import {
  CheckCircleIcon,
  CircleIcon,
  ClockIcon,
  ConfettiIcon,
} from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";
import { epfoService } from "@/application/service-instance";
import { CLAIM_SEQUENCE } from "@/domain/claim-machine";
import { CLAIM_STEP_CONTENT } from "@/domain/claim-timeline";
import { LinkButton, PageHeader } from "@/components/ui";
import { formatCurrency, formatDateTime, humanizeState } from "@/lib/format";

export const metadata = { title: "Claim timeline" };

export default async function ClaimPage({ params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = await params;
  const snapshot = epfoService.getSnapshot();
  if (snapshot.claim.id !== claimId) {
    notFound();
  }

  const { claim } = snapshot;
  const currentIndex = CLAIM_SEQUENCE.indexOf(claim.state);
  const currentContent = CLAIM_STEP_CONTENT[claim.state];
  const currentEntry = claim.stateHistory.findLast((entry) => entry.state === claim.state);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Synthetic claim · Form 19"
        title={`${formatCurrency(claim.requestedAmountPaise)} final PF settlement`}
        description="A detailed record of who is acting, what is happening, and what comes next."
        backHref="/"
        backLabel="Home"
        aside={
          <span className="rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-sm font-semibold text-[var(--accent)]">
            {humanizeState(claim.state)}
          </span>
        }
      />

      {claim.state === "DRAFT" ? (
        <section className="mt-8 rounded-2xl border border-[var(--warning)] bg-[var(--warning-soft)] p-6">
          <h2 className="font-semibold">This claim is still being prepared</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Claim Preflight must reach 100% before review and submission.
          </p>
          <div className="mt-5">
            <LinkButton href="/withdraw/preflight">Open Claim Preflight</LinkButton>
          </div>
        </section>
      ) : null}

      {claim.state === "READY" ? (
        <section className="mt-8 rounded-2xl border border-[var(--success)] bg-[var(--success-soft)] p-6">
          <h2 className="font-semibold">Your confirmation is needed</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            The claim is ready, but it has not been submitted.
          </p>
          <div className="mt-5">
            <LinkButton href="/withdraw/review">Review mock claim</LinkButton>
          </div>
        </section>
      ) : null}

      <div className="grid gap-8 py-9 lg:grid-cols-[0.8fr_1.2fr]">
        <section
          key={claim.state}
          className="state-enter rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-7 lg:sticky lg:top-24 lg:self-start"
        >
          {claim.state === "CREDITED" ? (
            <ConfettiIcon size={31} weight="fill" className="text-[var(--success)]" aria-hidden="true" />
          ) : (
            <ClockIcon size={29} weight="fill" className="text-[var(--accent)]" aria-hidden="true" />
          )}
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Current step
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">{currentContent.label}</h2>
          <dl className="mt-7 space-y-5">
            <div>
              <dt className="text-xs font-semibold text-[var(--muted)]">Responsible</dt>
              <dd className="mt-1 text-sm font-semibold">{currentContent.responsibleParty}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[var(--muted)]">Started</dt>
              <dd className="mt-1 text-sm font-semibold">
                {currentEntry ? formatDateTime(currentEntry.timestamp) : "Not recorded"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[var(--muted)]">What is happening</dt>
              <dd className="mt-1 text-sm leading-6">{currentContent.happening}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[var(--muted)]">Your action</dt>
              <dd className="mt-1 text-sm leading-6">{currentContent.citizenAction}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[var(--muted)]">What happens next</dt>
              <dd className="mt-1 text-sm leading-6">{currentContent.next}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-[-0.025em]">Full claim timeline</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Future steps stay specific so you always know the next responsible party.
          </p>
          <div className="mt-6 space-y-3">
            {CLAIM_SEQUENCE.map((state, index) => {
              const entry = claim.stateHistory.findLast((item) => item.state === state);
              const isComplete = index < currentIndex;
              const isCurrent = index === currentIndex;
              const content = CLAIM_STEP_CONTENT[state];
              return (
                <article
                  key={state}
                  className={`grid grid-cols-[1.75rem_1fr] gap-3 rounded-2xl border p-5 ${
                    isCurrent
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--line)] bg-[var(--surface)]"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircleIcon
                      size={22}
                      weight="fill"
                      className="mt-0.5 text-[var(--success)]"
                      aria-hidden="true"
                    />
                  ) : isCurrent ? (
                    <ClockIcon
                      size={22}
                      weight="fill"
                      className="mt-0.5 text-[var(--accent)]"
                      aria-hidden="true"
                    />
                  ) : (
                    <CircleIcon
                      size={22}
                      className="mt-0.5 text-[var(--line-strong)]"
                      aria-hidden="true"
                    />
                  )}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold">{content.label}</h3>
                      {entry ? (
                        <time className="text-xs text-[var(--muted)]" dateTime={entry.timestamp}>
                          {formatDateTime(entry.timestamp)}
                        </time>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                      {isComplete
                        ? `Completed by ${entry?.actorName ?? content.responsibleParty}.`
                        : isCurrent
                          ? content.happening
                          : `Comes next after ${CLAIM_STEP_CONTENT[CLAIM_SEQUENCE[index - 1]].label.toLowerCase()}. Responsible: ${content.responsibleParty}.`}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
