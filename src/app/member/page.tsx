import {
  BriefcaseIcon,
  CheckCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { epfoService } from "@/application/service-instance";
import { LinkButton, PageHeader, PrototypeNotice } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

export const metadata = { title: "Synthetic member" };

export default function MemberPage() {
  const snapshot = epfoService.getSnapshot();
  const { member } = snapshot;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        eyebrow="Synthetic member"
        title={member.name}
        description="A plain-language view of one synthetic PF profile and its employment history."
        aside={<LinkButton href="/withdraw">Start withdrawal</LinkButton>}
      />

      <section className="grid gap-5 py-10 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl bg-[var(--accent-fill)] p-6 text-white sm:p-8">
          <p className="text-sm font-medium text-white/75">Current synthetic PF balance</p>
          <p className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            {formatCurrency(member.currentPfBalancePaise)}
          </p>
          <p className="mt-5 max-w-md text-sm leading-6 text-white/75">
            This amount is created for the demo. It does not come from an EPFO or bank system.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Profile checks</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
            {["Identity", "PAN", "Bank"].map((label) => (
              <div key={label}>
                <CheckCircleIcon
                  size={21}
                  weight="fill"
                  className="text-[var(--success)]"
                  aria-hidden="true"
                />
                <p className="mt-2 text-sm font-semibold">{label}</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">Verified synthetic record</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-6">
        <h2 className="text-3xl font-semibold tracking-[-0.03em]">Employment history</h2>
        <p className="mt-3 max-w-2xl leading-7 text-[var(--muted)]">
          Each job can have its own PF record. Older records may need to be closed and brought together before a claim can proceed.
        </p>

        <div className="mt-9 space-y-5">
          {member.employments.toReversed().map((employment) => {
            const needsAttention =
              employment.exitStatus === "MISSING" || employment.transferStatus === "NOT_TRANSFERRED";
            return (
              <article
                key={employment.id}
                className={`rounded-2xl border bg-[var(--surface)] p-5 sm:p-7 ${needsAttention ? "border-[var(--warning)]" : "border-[var(--line)]"}`}
              >
                <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
                  <div className="flex gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--surface-muted)] text-[var(--accent)]">
                      <BriefcaseIcon size={23} aria-hidden="true" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">{employment.employerName}</h3>
                        {employment.isCurrent ? (
                          <span className="rounded-lg bg-[var(--success-soft)] px-2 py-1 text-xs font-semibold text-[var(--success)]">
                            Current employment
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {formatDate(employment.employmentStart)} to {formatDate(employment.employmentEnd)}
                      </p>
                    </div>
                  </div>
                  {needsAttention ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--warning)]">
                      <WarningCircleIcon size={19} weight="fill" aria-hidden="true" />
                      Needs attention
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--success)]">
                      <CheckCircleIcon size={19} weight="fill" aria-hidden="true" />
                      Record aligned
                    </span>
                  )}
                </div>

                {employment.id === "employment-demo-systems" ? (
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-[var(--surface-muted)] p-4">
                      <p className="text-xs font-medium text-[var(--muted)]">Balance in this record</p>
                      <p className="mt-1 text-lg font-semibold">
                        {employment.transferredAmountPaise > 0
                          ? `${formatCurrency(employment.transferredAmountPaise)} transferred`
                          : formatCurrency(employment.pfBalancePaise)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[var(--surface-muted)] p-4">
                      <p className="text-xs font-medium text-[var(--muted)]">Transfer</p>
                      <p className="mt-1 text-sm font-semibold">
                        {employment.transferStatus === "TRANSFERRED" ? "Transferred" : "Not transferred"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[var(--surface-muted)] p-4">
                      <p className="text-xs font-medium text-[var(--muted)]">Date of Exit</p>
                      <p className="mt-1 text-sm font-semibold">
                        {employment.exitStatus === "MISSING"
                          ? "Missing"
                          : formatDate(employment.pfRecordExitDate)}
                      </p>
                    </div>
                  </div>
                ) : null}

                {needsAttention ? (
                  <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
                    {employment.exitStatus === "MISSING" ? (
                      <Link className="text-[var(--accent)] hover:underline" href="/issues/issue-exit-date">
                        Fix missing Date of Exit
                      </Link>
                    ) : null}
                    {employment.transferStatus === "NOT_TRANSFERRED" ? (
                      <Link className="text-[var(--accent)] hover:underline" href="/issues/issue-old-balance">
                        Reconcile old balance
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <div className="mt-10">
        <PrototypeNotice compact />
      </div>
    </div>
  );
}
