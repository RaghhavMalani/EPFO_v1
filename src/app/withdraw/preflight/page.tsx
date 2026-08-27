import { ArrowRightIcon, CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { epfoService } from "@/application/service-instance";
import { LinkButton, PageHeader, StatusBadge, buttonClassName } from "@/components/ui";
import type { PreflightCheck } from "@/domain/schemas";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Form 19 preflight" };

function CheckRow({ check, index }: { check: PreflightCheck; index: number }) {
  const passed = check.status === "PASS";
  const displayLabel = !passed && check.id === "EXIT_DATE_RECORDED"
    ? "Date of Exit is missing"
    : !passed && check.id === "LEGACY_RECORD_ALIGNED"
      ? "Employment record needs review"
      : check.label;
  const nextStep = check.id === "EXIT_DATE_RECORDED"
    ? "The record is updated and preflight reruns automatically. Readiness moves to 6 of 7 checks."
    : "The employer reviews the proposed correction. Approval updates the record and preflight reruns automatically.";
  return (
    <article className={passed ? "preflight-row" : "preflight-row preflight-row--blocked"}>
      <div className="preflight-row__number tabular">{index + 1}</div>
      <div className="preflight-row__main">
        <div className="preflight-row__title">
          {passed ? <CheckCircleIcon size={19} weight="fill" aria-hidden="true" /> : <WarningCircleIcon size={19} weight="fill" aria-hidden="true" />}
          <span><strong>{displayLabel}</strong><small>{check.userExplanation}</small></span>
        </div>
        {!passed ? (
          <div className="resolution-panel">
            <dl>
              <div><dt>What is wrong</dt><dd>{check.reason}</dd></div>
              <div><dt>Why it matters</dt><dd>{check.userExplanation}</dd></div>
              <div><dt>Who can resolve it</dt><dd>{check.responsibleParty}</dd></div>
              <div><dt>Your next action</dt><dd>{check.recommendedAction}</dd></div>
              <div className="resolution-panel__wide"><dt>What happens next</dt><dd>{nextStep}</dd></div>
            </dl>
            {check.issueId ? <Link href={`/issues/${check.issueId}`}>Resolve issue <ArrowRightIcon size={16} aria-hidden="true" /></Link> : null}
          </div>
        ) : null}
      </div>
      <StatusBadge status={check.status} />
    </article>
  );
}

export default function PreflightPage() {
  const snapshot = epfoService.getSnapshot();
  return (
    <div className="page-shell page-shell--narrow">
      <PageHeader eyebrow="Online Services · Form 19 preflight" title="Final PF settlement" description="Preflight checks, issue ownership, and the action required before submission." backHref="/withdraw" backLabel="Withdrawal details" />

      <section className="preflight-facts panel" aria-label="Claim summary">
        <div><span>Eligible amount</span><strong className="tabular">{formatCurrency(snapshot.member.requestedWithdrawalPaise)}</strong></div>
        <div><span>Claim type</span><strong>Final PF settlement · Form 19</strong></div>
        <div><span>Readiness</span><strong className="tabular">{snapshot.readiness.passedCount} of {snapshot.readiness.totalChecks} checks passed</strong></div>
      </section>

      <section className="preflight-section">
        <div className="section-heading-row"><div><p className="record-label">Eligibility checks</p><h2 className="section-title">Every check, in order</h2></div><p className="section-support">No hidden weights</p></div>
        <div className="preflight-list panel">
          {snapshot.preflight.map((check, index) => <CheckRow key={check.id} check={check} index={index} />)}
        </div>
      </section>

      <section className={snapshot.readiness.isReady ? "preflight-decision preflight-decision--ready" : "preflight-decision"}>
        <div>{snapshot.readiness.isReady ? <CheckCircleIcon size={21} weight="fill" aria-hidden="true" /> : <WarningCircleIcon size={21} weight="fill" aria-hidden="true" />}<p><strong className="tabular">{snapshot.readiness.passedCount} of {snapshot.readiness.totalChecks} checks passed</strong><span>{snapshot.readiness.isReady ? "All required checks are complete." : `${snapshot.readiness.attentionCount} issues must be resolved before this claim can continue.`}</span></p></div>
        {snapshot.readiness.isReady ? <LinkButton href="/withdraw/review">Continue to claim</LinkButton> : <button type="button" disabled className={buttonClassName("primary")}>Continue to claim</button>}
      </section>
    </div>
  );
}
