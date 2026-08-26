import { BriefcaseIcon, CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { epfoService } from "@/application/service-instance";
import { LinkButton, PageHeader, PrototypeNotice } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

export const metadata = { title: "My Employment and PF History" };

export default function MemberPage() {
  const { member } = epfoService.getSnapshot();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        eyebrow="View"
        title="My Employment & PF History"
        description="One masked UAN connects each synthetic member record created across your employment history."
        aside={<LinkButton href="/manage" variant="secondary">Manage records</LinkButton>}
      />

      <section className="grid gap-5 py-9 md:grid-cols-[0.72fr_1.28fr]">
        <div className="rounded-2xl bg-[var(--accent-fill)] p-6 text-white sm:p-7">
          <p className="text-sm text-white/75">Universal Account Number</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.025em]">{member.uanMasked}</p>
          <p className="mt-5 text-sm leading-6 text-white/75">Synthetic and masked for this independent prototype.</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-7">
          <p className="text-sm text-[var(--muted)]">Total PF balance</p>
          <p className="mt-2 text-4xl font-semibold tracking-[-0.04em]">{formatCurrency(member.currentPfBalancePaise)}</p>
          <p className="mt-4 text-sm font-semibold">{member.employments.length} member records under one UAN</p>
        </div>
      </section>

      <section className="py-5">
        <h2 className="text-2xl font-semibold tracking-[-0.025em]">Employment records</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Each employer created a distinct member record. The UAN provides the umbrella view across them.</p>
        <div className="mt-6 space-y-4">
          {member.employments.toReversed().map((employment) => {
            const needsAttention = employment.exitStatus === "MISSING" || employment.legacyRecordStatus === "REVIEW_REQUIRED";
            return (
              <article key={employment.id} className={`rounded-2xl border bg-[var(--surface)] p-5 sm:p-7 ${needsAttention ? "border-[var(--warning)]" : "border-[var(--line)]"}`}>
                <div className="grid gap-5 md:grid-cols-[1fr_auto]">
                  <div className="flex gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--surface-muted)] text-[var(--accent)]"><BriefcaseIcon size={23} aria-hidden="true" /></span>
                    <div>
                      <h3 className="text-lg font-semibold">{employment.employerName}</h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">{employment.memberRecordLabel} · {formatDate(employment.employmentStart)} to {formatDate(employment.employmentEnd)}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${needsAttention ? "text-[var(--warning)]" : "text-[var(--success)]"}`}>
                    {needsAttention ? <WarningCircleIcon size={19} weight="fill" aria-hidden="true" /> : <CheckCircleIcon size={19} weight="fill" aria-hidden="true" />}
                    {needsAttention ? "Action needed" : "Record aligned"}
                  </span>
                </div>
                <dl className="mt-6 grid gap-4 border-t border-[var(--line)] pt-5 sm:grid-cols-4">
                  <div><dt className="text-xs text-[var(--muted)]">PF balance</dt><dd className="mt-1 text-sm font-semibold">{formatCurrency(employment.pfBalancePaise)}</dd></div>
                  <div><dt className="text-xs text-[var(--muted)]">Date of Exit</dt><dd className="mt-1 text-sm font-semibold">{employment.pfRecordExitDate ? formatDate(employment.pfRecordExitDate) : "Member can mark now"}</dd></div>
                  <div><dt className="text-xs text-[var(--muted)]">Service-end reason</dt><dd className="mt-1 text-sm font-semibold">{employment.serviceEndReason ? "Resignation" : "Employer review needed"}</dd></div>
                  <div><dt className="text-xs text-[var(--muted)]">Transfer</dt><dd className="mt-1 text-sm font-semibold">{employment.transferredAmountPaise > 0 ? `${formatCurrency(employment.transferredAmountPaise)} transferred` : "Record retained"}</dd></div>
                </dl>
                {needsAttention ? <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold">
                  {employment.exitStatus === "MISSING" ? <Link href="/manage/mark-exit" className="text-[var(--accent)] hover:underline">Mark Date of Exit</Link> : null}
                  {employment.legacyRecordStatus === "REVIEW_REQUIRED" ? <Link href="/issues/issue-legacy-record" className="text-[var(--accent)] hover:underline">Open employer review issue</Link> : null}
                </div> : null}
              </article>
            );
          })}
        </div>
      </section>
      <div className="mt-10"><PrototypeNotice compact /></div>
    </div>
  );
}
