import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { epfoService } from "@/application/service-instance";
import { ActionButton } from "@/components/action-button";
import { PageHeader, PrototypeNotice } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Final PF settlement" };

export default function WithdrawPage() {
  const { member, withdrawalService } = epfoService.getSnapshot();
  return (
    <div className="page-shell page-shell--narrow">
      <PageHeader eyebrow="Online Services · Claim" title="Final PF settlement" description="Check your account before starting the synthetic Form 19 journey." backHref="/online-services" backLabel="Online Services" />
      <div className="claim-start-layout">
        <section className="claim-start panel">
          <div className="claim-start__amount"><p className="record-label">Eligible amount</p><strong className="tabular">{formatCurrency(member.requestedWithdrawalPaise)}</strong><span>Full available PF balance under {member.uanMasked}</span></div>
          <dl className="claim-start__facts">
            <div><dt>Claim type</dt><dd>Form 19</dd></div>
            <div><dt>Employment status</dt><dd>Not currently PF-covered</dd></div>
            <div><dt>Checks required</dt><dd>Seven deterministic checks</dd></div>
          </dl>
          <div className="claim-start__action"><ActionButton endpoint="/api/actions/preflight" body={{}} successHref="/withdraw/preflight" showArrow>Run seven readiness checks</ActionButton><p>{withdrawalService.explanation} AI does not decide eligibility or amounts.</p></div>
        </section>
        <aside className="claim-steps">
          <h2 className="section-title">Before you submit</h2>
          {[
            ["1", "Check", "See every passed check and every blocker."],
            ["2", "Resolve", "Follow the exact owner and required action."],
            ["3", "Review", "Confirm the claim only when all checks pass."],
          ].map(([number, title, text]) => <div key={number}><span>{number}</span><p><strong>{title}</strong><small>{text}</small></p></div>)}
          <p className="claim-steps__note"><CheckCircleIcon size={16} weight="fill" aria-hidden="true" /> No claim is submitted on this screen.</p>
        </aside>
      </div>
      <PrototypeNotice compact />
    </div>
  );
}
