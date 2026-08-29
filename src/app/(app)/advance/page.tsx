import { CheckIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { epfoService, experienceV2Service } from "@/application/service-instance";
import { AdvanceSubmitForm, GOAL_LABELS, GoalPicker, SimulateProcessingButton } from "@/components/advance-form";
import { LinkButton, PageHeader, PrototypeNotice } from "@/components/ui";
import { ADVANCE_SEQUENCE } from "@/domain/advance-machine";
import type { AdvanceState } from "@/domain/experience-v2";
import { StateSequenceMap } from "@/components/state-sequence-map";
import { formatCurrency, humanizeState } from "@/lib/format";

export const metadata = { title: "PF advance · Form 31" };

const SEQUENCE_LABELS: Record<AdvanceState, string> = {
  DRAFT: "Choose purpose",
  READY: "Review amount",
  SUBMITTED: "Submitted",
  EPFO_PROCESSING: "EPFO processing",
  CREDITED: "Credited",
  NOT_ELIGIBLE: "Not eligible",
};

export default function AdvancePage() {
  const { advance } = experienceV2Service.getExperience();
  const { member } = epfoService.getSnapshot();
  const isPreSubmission = advance.state === "DRAFT" || advance.state === "READY" || advance.state === "NOT_ELIGIBLE";
  const anchorAmount = advance.state === "DRAFT" || advance.state === "NOT_ELIGIBLE"
    ? advance.maximumEligibleAmountPaise
    : advance.requestedAmountPaise || advance.maximumEligibleAmountPaise;

  return (
    <div className="page-shell page-shell--narrow">
      <PageHeader
        eyebrow="Online Services · Form 31"
        title="PF advance"
        description="A partial, goal-based withdrawal against your PF balance. Eligibility and the maximum amount are calculated deterministically from your synthetic record."
        backHref="/online-services"
        backLabel="Online Services"
        aside={<span className="rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-sm font-semibold text-[var(--accent)]">{humanizeState(advance.state)}</span>}
      />

      <section className="claim-anchor" aria-label="Advance summary" key={`${advance.goal}-${advance.state}`}>
        <div className="claim-anchor__amount state-enter">
          <p className="record-label">{advance.state === "CREDITED" ? "Credited amount" : "Maximum eligible amount"}</p>
          <p className="balance-value tabular">{formatCurrency(anchorAmount)}</p>
        </div>
        <dl className="claim-anchor__facts">
          <div><dt>Purpose</dt><dd>{GOAL_LABELS[advance.goal]}</dd></div>
          <div><dt>PF balance available</dt><dd className="tabular">{formatCurrency(member.currentPfBalancePaise)}</dd></div>
          <div><dt>Eligibility</dt><dd className={!advance.eligible ? "claim-anchor__open" : undefined}>{advance.eligible ? "Eligible" : "Blocked"}</dd></div>
        </dl>
      </section>

      {isPreSubmission ? (
        <section className="py-8">
          <h2 className="section-title">Choose a purpose</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Each purpose applies its own synthetic minimum service period and wage-multiple ceiling.</p>
          <GoalPicker goal={advance.goal} />
        </section>
      ) : (
        <section className="py-8">
          <h2 className="section-title">Advance progress</h2>
          <StateSequenceMap
            sequence={ADVANCE_SEQUENCE}
            current={advance.state}
            labels={SEQUENCE_LABELS}
            ariaLabel="PF advance progress"
          />
        </section>
      )}

      <section className="preflight-columns">
        <div className="check-list">
          <h2>Deterministic eligibility calculation</h2>
          <ul>
            {advance.checks.map((check) => (
              <li key={check.id} className={check.status === "PASS" ? "check-line check-line--done" : "check-line check-line--open"}>
                {check.status === "PASS" ? <CheckIcon size={15} weight="bold" aria-hidden="true" /> : <WarningCircleIcon size={15} weight="fill" aria-hidden="true" />}
                <span>{check.label}</span>
                <em>{check.status === "PASS" ? "Pass" : "Block"}</em>
              </li>
            ))}
          </ul>
          <p className="check-list__note">{advance.ruleExplanation}</p>
        </div>

        <div className="next-actions">
          {advance.state === "NOT_ELIGIBLE" ? (
            <article className="action-item">
              <div className="action-item__head">
                <WarningCircleIcon size={22} weight="fill" className="text-[var(--warning)]" aria-hidden="true" />
                <div>
                  <h3>Not eligible for this purpose yet</h3>
                  <p>{advance.recommendedNextAction}</p>
                </div>
              </div>
            </article>
          ) : advance.state === "READY" ? (
            <div className="panel p-6">
              <h2 className="section-title">Review and submit</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{advance.recommendedNextAction} The amount is capped at the deterministic maximum shown above.</p>
              <AdvanceSubmitForm advance={advance} />
            </div>
          ) : advance.state === "SUBMITTED" || advance.state === "EPFO_PROCESSING" ? (
            <div className="panel p-6">
              <h2 className="section-title">{advance.state === "SUBMITTED" ? "Submitted for EPFO processing" : "EPFO is processing this advance"}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {advance.state === "SUBMITTED"
                  ? "This synthetic request is queued. In this prototype, processing steps are simulated on demand."
                  : "The synthetic bank credit step is next."}
              </p>
              <div className="mt-5">
                <SimulateProcessingButton label={advance.state === "SUBMITTED" ? "Simulate EPFO processing (demo)" : "Simulate bank credit (demo)"} />
              </div>
            </div>
          ) : (
            <div className="panel p-6">
              <CheckIcon size={24} weight="bold" className="text-[var(--success)]" aria-hidden="true" />
              <h2 className="section-title mt-3">Advance credited</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{formatCurrency(advance.requestedAmountPaise)} was credited to the masked bank account and posted to your PF balance.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <LinkButton href="/claims">View claim centre</LinkButton>
                <LinkButton href="/passbook" variant="secondary">Open passbook</LinkButton>
              </div>
            </div>
          )}
        </div>
      </section>

      <PrototypeNotice compact />
    </div>
  );
}
