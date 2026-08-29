import {
  ArrowRightIcon,
  CheckIcon,
  LockSimpleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { epfoService } from "@/application/service-instance";
import { LinkButton, PageHeader } from "@/components/ui";
import type { Issue, PreflightCheck } from "@/domain/schemas";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Final settlement readiness" };

/** The short name each check goes by in the readiness map. */
const MAP_LABELS: Record<PreflightCheck["id"], string> = {
  IDENTITY_VERIFIED: "Identity",
  AADHAAR_LINKED: "Aadhaar",
  PAN_VERIFIED: "PAN",
  MOBILE_VERIFIED: "Mobile",
  BANK_VERIFIED: "Bank",
  EXIT_DATE_RECORDED: "Date of Exit",
  LEGACY_RECORD_ALIGNED: "Service record",
};

function ReadinessMap({ checks }: { checks: PreflightCheck[] }) {
  return (
    <ol className="readiness-map" aria-label="Readiness across all seven checks">
      {checks.map((check, index) => {
        const passed = check.status === "PASS";
        return (
          <li key={check.id} className={passed ? "map-node map-node--done" : "map-node map-node--open"}>
            <span className="map-node__marker" aria-hidden="true">
              {passed ? <CheckIcon size={13} weight="bold" /> : <span className="tabular">{index + 1}</span>}
            </span>
            <span className="map-node__label">{MAP_LABELS[check.id]}</span>
            <span className="sr-only">{passed ? "Complete" : "Action required"}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function PreflightPage() {
  const snapshot = epfoService.getSnapshot();
  const { readiness, preflight } = snapshot;
  const blockers = preflight.filter((check) => check.status !== "PASS");
  const passed = preflight.filter((check) => check.status === "PASS");
  const issueFor = (check: PreflightCheck): Issue | undefined =>
    snapshot.issues.find((issue) => issue.id === check.issueId);

  return (
    <div className="page-shell page-shell--narrow">
      <PageHeader
        title="Final settlement readiness"
        description="Form 19 is the application to settle your PF in full. It can be filed once every required check is complete."
        backHref="/withdraw"
        backLabel="Withdrawal details"
      />

      <section className="claim-anchor" aria-label="Claim summary">
        <div className="claim-anchor__amount">
          <p className="record-label">Eligible amount</p>
          <p className="balance-value tabular">{formatCurrency(snapshot.member.requestedWithdrawalPaise)}</p>
        </div>
        <dl className="claim-anchor__facts">
          <div>
            <dt>Claim</dt>
            <dd>Final PF settlement, Form 19</dd>
          </div>
          <div>
            <dt>Readiness</dt>
            <dd className="tabular">{readiness.passedCount} of {readiness.totalChecks} checks complete</dd>
          </div>
          <div>
            <dt>Outstanding</dt>
            <dd className={blockers.length > 0 ? "claim-anchor__open" : undefined}>
              {blockers.length > 0 ? `${blockers.length} actions required` : "Nothing outstanding"}
            </dd>
          </div>
        </dl>
      </section>

      <ReadinessMap checks={preflight} />

      <section className="preflight-columns">
        <div className="check-list">
          <h2>All checks</h2>
          <ul>
            {passed.map((check) => (
              <li key={check.id} className="check-line check-line--done">
                <CheckIcon size={15} weight="bold" aria-hidden="true" />
                <span>{check.label}</span>
                <em>Complete</em>
              </li>
            ))}
            {blockers.map((check) => (
              <li key={check.id} className="check-line check-line--open">
                <WarningCircleIcon size={15} weight="fill" aria-hidden="true" />
                <span>{check.label}</span>
                <em>Action required</em>
              </li>
            ))}
          </ul>
          <details className="readiness-explainer">
            <summary>How readiness is decided</summary>
            <p>
              Readiness is {readiness.passedCount} of {readiness.totalChecks} because every check counts once and
              counts equally. Form 19 opens when all {readiness.totalChecks} are complete.
            </p>
          </details>
          <p className="check-list__note">
            {blockers.length > 0
              ? `Once both actions are complete, Form 19 unlocks and the settlement moves to review.`
              : "Every check is complete, so Form 19 can be filed."}
          </p>
        </div>

        <div className="next-actions">
          <h2>{blockers.length > 0 ? "What needs to happen next" : "Nothing left to resolve"}</h2>
          {blockers.map((check, index) => {
            const issue = issueFor(check);
            const from = readiness.passedCount + index;
            return (
              <article key={check.id} className="action-item">
                <div className="action-item__head">
                  <span className="action-item__step tabular" aria-hidden="true">{index + 1}</span>
                  <div>
                    <h3>{issue?.title ?? check.label}</h3>
                    <p>{check.reason}</p>
                  </div>
                </div>
                <dl className="action-item__grid">
                  <div>
                    <dt>Why it matters</dt>
                    <dd>{issue?.whyItMatters ?? "This check is required before Form 19 can be filed."}</dd>
                  </div>
                  <div>
                    <dt>Who can resolve it</dt>
                    <dd>{check.responsibleParty}</dd>
                  </div>
                  <div>
                    <dt>Your next action</dt>
                    <dd>{check.recommendedAction}</dd>
                  </div>
                  <div>
                    <dt>What happens next</dt>
                    <dd className="tabular">
                      Readiness moves from {from} of {readiness.totalChecks} to {from + 1} of {readiness.totalChecks}.
                    </dd>
                  </div>
                </dl>
                {check.issueId ? (
                  <Link href={`/issues/${check.issueId}`} className="action-item__link">
                    Resolve this check
                    <ArrowRightIcon size={16} aria-hidden="true" />
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className={readiness.isReady ? "decision-bar decision-bar--ready" : "decision-bar"}>
        <p>
          <strong className="tabular">{readiness.passedCount} of {readiness.totalChecks} checks complete</strong>
          <span id="decision-reason">
            {readiness.isReady
              ? "Form 19 is ready to file."
              : `Form 19 stays locked until the remaining ${readiness.attentionCount} checks are resolved.`}
          </span>
        </p>
        {readiness.isReady ? (
          <LinkButton href="/withdraw/review">Continue to claim</LinkButton>
        ) : (
          <button type="button" aria-disabled="true" aria-describedby="decision-reason" className="locked-button">
            <LockSimpleIcon size={16} weight="fill" aria-hidden="true" />
            Continue to claim
          </button>
        )}
      </section>
    </div>
  );
}
