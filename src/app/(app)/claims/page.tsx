import { ArrowRightIcon, CheckCircleIcon, ClockIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { epfoService, experienceV2Service } from "@/application/service-instance";
import { LinkButton, PageHeader, PrototypeNotice } from "@/components/ui";
import { CLAIM_SEQUENCE } from "@/domain/claim-machine";
import { CLAIM_STEP_CONTENT } from "@/domain/claim-timeline";
import { formatCurrency, formatDate, humanizeState } from "@/lib/format";

export const metadata = { title: "Claim centre" };

const TYPE_LABELS = { FORM_19: "Final settlement", FORM_31: "PF advance" } as const;

export default function ClaimsIndexPage() {
  const snapshot = epfoService.getSnapshot();
  const experience = experienceV2Service.getExperience();
  const { claim } = snapshot;
  const currentIndex = CLAIM_SEQUENCE.indexOf(claim.state);
  const currentContent = CLAIM_STEP_CONTENT[claim.state];

  const settled = [
    ...experience.pastClaims,
    ...(claim.state === "CREDITED"
      ? [{
          id: claim.id,
          type: "FORM_19" as const,
          label: "Final PF settlement",
          amountPaise: claim.requestedAmountPaise,
          submittedAt: claim.createdAt,
          completedAt: claim.updatedAt,
          state: "CREDITED" as const,
        }]
      : []),
  ].toSorted((a, b) => b.completedAt.localeCompare(a.completedAt));

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Online Services"
        title="Claim centre"
        description="Every claim and advance filed against your PF balance, active progression and settled history in one place."
      />

      <section className="py-8" aria-label="Active claim">
        <h2 className="section-title">Active claim</h2>
        {claim.state === "DRAFT" ? (
          <div className="panel claim-centre-empty">
            <ClockIcon size={24} className="text-[var(--muted)]" aria-hidden="true" />
            <div>
              <p className="font-semibold">No active claim in progress</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Run Claim Preflight to check readiness before filing a final PF settlement.</p>
            </div>
            <LinkButton href="/withdraw">Start final settlement</LinkButton>
          </div>
        ) : claim.state === "CREDITED" ? (
          <div className="panel claim-centre-empty">
            <CheckCircleIcon size={24} weight="fill" className="text-[var(--success)]" aria-hidden="true" />
            <div>
              <p className="font-semibold">No claim is currently active</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Your most recent final settlement is settled below. Start a new service from Online Services.</p>
            </div>
            <LinkButton href="/online-services" variant="secondary">Online Services</LinkButton>
          </div>
        ) : (
          <Link href={`/claims/${claim.id}`} className="panel claim-centre-active link-row state-enter" key={claim.state}>
            <div className="claim-centre-active__amount">
              <p className="record-label">Final PF settlement</p>
              <p className="tabular">{formatCurrency(claim.requestedAmountPaise)}</p>
            </div>
            <div className="claim-centre-active__step">
              <p className="record-label">Current step</p>
              <strong>{currentContent.label}</strong>
              <small>{currentIndex + 1} of {CLAIM_SEQUENCE.length} · {currentContent.responsibleParty}</small>
            </div>
            <ArrowRightIcon size={20} aria-hidden="true" />
          </Link>
        )}
      </section>

      <section className="py-8" aria-label="Settled claims">
        <h2 className="section-title">Settled claims</h2>
        {settled.length === 0 ? (
          <p className="employer-empty panel">Nothing has settled yet.</p>
        ) : (
          <ul className="claim-ledger panel">
            {settled.map((item) => (
              <li key={item.id} className="claim-ledger__row">
                <span className="claim-type-tag">{TYPE_LABELS[item.type]}</span>
                <span className="claim-ledger__body">
                  <strong>{item.label}</strong>
                  <small>Filed {formatDate(item.submittedAt)} · Settled {formatDate(item.completedAt)}</small>
                </span>
                <span className="tabular claim-ledger__amount">{formatCurrency(item.amountPaise)}</span>
                <span className="ledger-status"><CheckCircleIcon size={15} weight="fill" aria-hidden="true" />{humanizeState(item.state)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PrototypeNotice compact />
    </div>
  );
}
