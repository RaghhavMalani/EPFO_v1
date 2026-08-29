import { ArrowRightIcon, CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { loadSession } from "@/application/session";
import { LinkButton, PageHeader, PrototypeNotice } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

export const metadata = { title: "Service history" };

export default async function MemberPage() {
  const { epfoService } = await loadSession();
  const { member } = epfoService.getSnapshot();
  const oldestEmployment = member.employments.at(0)!;

  return (
    <div className="page-shell">
      <PageHeader eyebrow="View · Service history" title="Employment and PF history" description="All employment records linked to your masked UAN, with record status and the exact action required." aside={<LinkButton href="/manage" variant="secondary">Manage records</LinkButton>} />

      <section className="history-summary panel" aria-label="Service history summary">
        <div><span>PF balance</span><strong className="tabular">{formatCurrency(member.currentPfBalancePaise)}</strong></div>
        <div><span>Member records</span><strong>{member.employments.length} under one UAN</strong></div>
        <div><span>Coverage since</span><strong className="tabular">{formatDate(oldestEmployment.employmentStart)}</strong></div>
        <div><span>Masked UAN</span><strong className="tabular">{member.uanMasked}</strong></div>
      </section>

      <section className="history-section">
        <div className="section-heading-row"><div><p className="record-label">Linked records</p><h2 className="section-title">Service history</h2></div><p className="section-support">Newest employment first</p></div>
        <div className="history-table panel" role="table" aria-label="Employment service history">
          <div className="history-table__head" role="row"><span role="columnheader">Establishment</span><span role="columnheader">Member ID</span><span role="columnheader">Service period</span><span role="columnheader">PF record</span><span role="columnheader">Status</span><span role="columnheader">Action</span></div>
          {member.employments.toReversed().map((employment) => {
            const needsAttention = employment.exitStatus === "MISSING" || employment.legacyRecordStatus === "REVIEW_REQUIRED";
            return (
              <article role="row" key={employment.id} className={needsAttention ? "history-row history-row--attention" : "history-row"}>
                <div role="cell" data-label="Establishment"><strong>{employment.employerName}</strong><small>{employment.isCurrent ? "Current employment" : "Past employment"}</small></div>
                <div role="cell" data-label="Member ID"><span className="tabular">{employment.memberRecordLabel}</span></div>
                <div role="cell" data-label="Service period"><span className="tabular">{formatDate(employment.employmentStart)}</span><small>to {formatDate(employment.employmentEnd)}</small></div>
                <div role="cell" data-label="PF record"><strong className="tabular">{formatCurrency(employment.pfBalancePaise)}</strong><small>{employment.transferredAmountPaise > 0 ? `${formatCurrency(employment.transferredAmountPaise)} transferred` : "Balance retained"}</small></div>
                <div role="cell" data-label="Status" className={needsAttention ? "history-status history-status--attention" : "history-status"}>{needsAttention ? <WarningCircleIcon size={16} weight="fill" aria-hidden="true" /> : <CheckCircleIcon size={16} weight="fill" aria-hidden="true" />}<span>{needsAttention ? "Action needed" : "Record aligned"}</span></div>
                <div role="cell" className="history-action">
                  {employment.exitStatus === "MISSING" ? <Link href="/manage/mark-exit">Mark exit <ArrowRightIcon size={15} aria-hidden="true" /></Link> : employment.legacyRecordStatus === "REVIEW_REQUIRED" ? <Link href="/issues/issue-legacy-record">Review issue <ArrowRightIcon size={15} aria-hidden="true" /></Link> : <span>No action</span>}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <PrototypeNotice compact />
    </div>
  );
}
