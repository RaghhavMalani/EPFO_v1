import { CalendarCheckIcon, CheckCircleIcon, IdentificationCardIcon } from "@phosphor-icons/react/dist/ssr";
import { loadSession } from "@/application/session";
import { ActionButton } from "@/components/action-button";
import { LinkButton, PageHeader, PrototypeNotice, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Mark Date of Exit" };

export default async function MarkExitPage() {
  const { epfoService } = await loadSession();
  const snapshot = epfoService.getSnapshot();
  const issue = snapshot.issues.find((candidate) => candidate.type === "MISSING_EXIT_DATE")!;
  const employment = snapshot.member.employments.find((record) => record.id === issue.relatedEmploymentId)!;

  return (
    <div className="page-shell page-shell--narrow">
      <PageHeader
        eyebrow="Manage · Employment details"
        title="Mark Date of Exit"
        description="Review and close your last synthetic employment record through member self-service."
        backHref="/manage"
        backLabel="Manage"
        aside={<StatusBadge status={issue.status} />}
      />

      {issue.status === "RESOLVED" ? (
        <section className="state-enter mt-9 rounded-2xl border border-[var(--success)] bg-[var(--success-soft)] p-6 sm:p-8">
          <CheckCircleIcon size={30} weight="fill" className="text-[var(--success)]" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-semibold">Date of Exit recorded</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{formatDate(employment.pfRecordExitDate)} is now recorded. The account automatically moved to 6 of 7 readiness checks.</p>
          <div className="mt-6"><LinkButton href="/withdraw/preflight">Continue to Claim Preflight</LinkButton></div>
        </section>
      ) : (
        <div className="grid gap-8 py-9 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Employment record</h2>
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              <div><dt className="text-xs font-semibold text-[var(--muted)]">Employer</dt><dd className="mt-1 text-sm font-semibold">{employment.employerName}</dd></div>
              <div><dt className="text-xs font-semibold text-[var(--muted)]">Member record</dt><dd className="mt-1 text-sm font-semibold">{employment.memberRecordLabel}</dd></div>
              <div><dt className="text-xs font-semibold text-[var(--muted)]">Current Date of Exit</dt><dd className="mt-1 text-sm font-semibold">Not recorded</dd></div>
              <div><dt className="text-xs font-semibold text-[var(--muted)]">Proposed Date of Exit</dt><dd className="mt-1 text-sm font-semibold">{formatDate(employment.employmentEnd)}</dd></div>
              <div><dt className="text-xs font-semibold text-[var(--muted)]">Time since leaving</dt><dd className="mt-1 text-sm font-semibold">{snapshot.member.policy.daysSinceLastExit} days</dd></div>
              <div><dt className="text-xs font-semibold text-[var(--muted)]">Self-service waiting period</dt><dd className="mt-1 text-sm font-semibold">{snapshot.member.policy.markExitWaitingPeriodDays} days</dd></div>
            </dl>
            {issue.status === "OPEN" ? (
              <ActionButton endpoint={`/api/actions/issues/${issue.id}`} body={{ action: "START_MARK_EXIT" }} className="mt-7" showArrow>Review proposed Date of Exit</ActionButton>
            ) : (
              <ActionButton endpoint={`/api/actions/issues/${issue.id}`} body={{ action: "COMPLETE_MARK_EXIT" }} successHref="/withdraw/preflight" className="mt-7" showArrow>Confirm synthetic Date of Exit</ActionButton>
            )}
          </section>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
              <CalendarCheckIcon size={25} className="text-[var(--accent)]" aria-hidden="true" />
              <h2 className="mt-4 font-semibold">Why self-service is available</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
                <li>Waiting period completed: {snapshot.member.policy.daysSinceLastExit} of {snapshot.member.policy.markExitWaitingPeriodDays} days</li>
                <li>Masked synthetic Aadhaar status is verified</li>
                <li>Masked synthetic mobile status is verified</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[var(--info-line)] bg-[var(--info-soft)] p-5">
              <IdentificationCardIcon size={22} className="text-[var(--info)]" aria-hidden="true" />
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">A real portal may require Aadhaar OTP. This prototype never asks for or verifies a real OTP.</p>
            </div>
          </aside>
        </div>
      )}
      <PrototypeNotice compact />
    </div>
  );
}
