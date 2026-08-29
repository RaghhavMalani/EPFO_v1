import { ArrowRightIcon, CheckIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { epfoService, experienceV2Service } from "@/application/service-instance";
import { DemoBadge, LinkButton, PageHeader, PrototypeNotice } from "@/components/ui";
import { StateSequenceMap } from "@/components/state-sequence-map";
import { TransferActionButton } from "@/components/transfer-form";
import { TRANSFER_SEQUENCE } from "@/domain/transfer-machine";
import type { TransferState } from "@/domain/experience-v2";
import { formatCurrency, humanizeState } from "@/lib/format";

export const metadata = { title: "PF transfer · Form 13" };

const SEQUENCE_LABELS: Record<TransferState, string> = {
  DRAFT: "Draft",
  READY: "Ready",
  SUBMITTED: "Submitted",
  PREVIOUS_RECORD_VERIFIED: "Previous record verified",
  CURRENT_RECORD_VERIFIED: "Current record verified",
  EPFO_PROCESSING: "EPFO processing",
  BALANCE_MOVED: "Balance moved",
  COMPLETED: "Completed",
};

export default function TransferPage() {
  const { transfer } = experienceV2Service.getExperience();
  const { member } = epfoService.getSnapshot();
  const source = member.employments.find((record) => record.id === transfer.previousEmploymentId);
  const target = member.employments.find((record) => record.id === transfer.currentEmploymentId);
  const blockers = transfer.checks.filter((check) => check.status === "BLOCK");
  const isDraft = transfer.state === "DRAFT";

  return (
    <div className="page-shell page-shell--narrow">
      <PageHeader
        eyebrow="Online Services · Form 13"
        title="Transfer PF"
        description="Consolidate a previous employer's PF account into your current one. Every step is guarded and leaves an audit trail."
        backHref="/online-services"
        backLabel="Online Services"
        aside={<span className="rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-sm font-semibold text-[var(--accent)]">{humanizeState(transfer.state)}</span>}
      />

      <section className="claim-anchor" aria-label="Transfer summary" key={transfer.state}>
        <div className="claim-anchor__amount state-enter">
          <p className="record-label">Amount to consolidate</p>
          <p className="balance-value tabular">{formatCurrency(transfer.amountPaise)}</p>
        </div>
        <dl className="claim-anchor__facts">
          <div><dt>From</dt><dd>{source?.employerName ?? "Unknown"}</dd></div>
          <div><dt>To</dt><dd>{target?.employerName ?? "Unknown"}</dd></div>
          <div><dt>Outstanding</dt><dd className={blockers.length > 0 ? "claim-anchor__open" : undefined}>{blockers.length > 0 ? `${blockers.length} blocker` : "Nothing outstanding"}</dd></div>
        </dl>
      </section>

      <section className="transfer-consolidation panel" aria-label="Account consolidation">
        <div className="transfer-consolidation__node">
          <p className="record-label">Previous employer</p>
          <strong>{source?.employerName ?? "Unknown"}</strong>
          <span className="tabular">{source ? formatCurrency(source.pfBalancePaise) : "—"} on record</span>
        </div>
        <ArrowRightIcon size={26} className="transfer-consolidation__arrow" aria-hidden="true" />
        <div className="transfer-consolidation__node transfer-consolidation__node--target">
          <p className="record-label">Current employer</p>
          <strong>{target?.employerName ?? "Unknown"}</strong>
          <span className="tabular">
            {target ? formatCurrency(target.pfBalancePaise) : "—"} on record
            {transfer.state === "BALANCE_MOVED" || transfer.state === "COMPLETED" ? " · includes the transfer" : ""}
          </span>
        </div>
      </section>

      <section className="py-8">
        <h2 className="section-title">Transfer progress</h2>
        <StateSequenceMap
          sequence={TRANSFER_SEQUENCE}
          current={transfer.state}
          labels={SEQUENCE_LABELS}
          ariaLabel="PF transfer progress"
        />
      </section>

      <section className="preflight-columns">
        <div className="check-list">
          <h2>Transfer readiness</h2>
          <ul>
            {transfer.checks.map((check) => (
              <li key={check.id} className={check.status === "PASS" ? "check-line check-line--done" : "check-line check-line--open"}>
                {check.status === "PASS" ? <CheckIcon size={15} weight="bold" aria-hidden="true" /> : <WarningCircleIcon size={15} weight="fill" aria-hidden="true" />}
                <span>{check.label}</span>
                <em>{check.status === "PASS" ? "Pass" : "Block"}</em>
              </li>
            ))}
          </ul>
        </div>

        <div className="next-actions">
          {isDraft && blockers.length > 0 ? (
            <article className="action-item">
              <div className="action-item__head">
                <WarningCircleIcon size={22} weight="fill" className="text-[var(--warning)]" aria-hidden="true" />
                <div>
                  <h3>{blockers[0].label}</h3>
                  <p>{blockers[0].explanation}</p>
                </div>
              </div>
              <div className="mt-4">
                <TransferActionButton action="RESOLVE_BLOCKER" label="Request employer correction" />
              </div>
            </article>
          ) : transfer.state === "READY" ? (
            <div className="panel p-6">
              <h2 className="section-title">Ready to submit</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Every readiness check passes. Submitting moves this transfer to EPFO for processing.</p>
              <div className="mt-5">
                <TransferActionButton action="ADVANCE" label="Submit transfer request" />
              </div>
            </div>
          ) : transfer.state === "COMPLETED" ? (
            <div className="panel p-6">
              <CheckIcon size={24} weight="bold" className="text-[var(--success)]" aria-hidden="true" />
              <h2 className="section-title mt-3">Transfer complete</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{formatCurrency(transfer.amountPaise)} was consolidated into {target?.employerName}. Your PF balance and passbook reflect the move.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <LinkButton href="/member">View employment history</LinkButton>
                <LinkButton href="/passbook" variant="secondary">Open passbook</LinkButton>
              </div>
            </div>
          ) : (
            <div className="panel p-6">
              <h2 className="section-title">{SEQUENCE_LABELS[transfer.state]}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Your transfer is moving through EPFO&apos;s processing stages.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <TransferActionButton action="ADVANCE" label="Advance to next stage" variant="secondary" />
                <DemoBadge />
              </div>
            </div>
          )}
        </div>
      </section>

      <PrototypeNotice compact />
    </div>
  );
}
