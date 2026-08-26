import {
  CheckCircleIcon,
  EyeIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react/dist/ssr";
import { epfoService } from "@/application/service-instance";
import { ActionButton } from "@/components/action-button";
import { PageHeader, PrototypeNotice } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Withdraw PF" };

export default function WithdrawPage() {
  const { member } = epfoService.getSnapshot();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        title="Withdraw from your PF"
        description="First, we will check the synthetic account for anything that could stop or delay this claim."
        backHref="/"
        backLabel="Choose another goal"
      />

      <div className="grid gap-8 py-10 lg:grid-cols-[1fr_0.72fr]">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8">
          <p className="text-sm font-medium text-[var(--muted)]">Requested withdrawal</p>
          <p className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
            {formatCurrency(member.requestedWithdrawalPaise)}
          </p>
          <div className="mt-6 rounded-xl bg-[var(--surface-muted)] p-4 text-sm leading-6">
            <p className="font-semibold">Available synthetic balance</p>
            <p className="mt-1 text-[var(--muted)]">
              {formatCurrency(member.currentPfBalancePaise)} across this demo profile.
            </p>
          </div>
          <ActionButton
            endpoint="/api/actions/preflight"
            body={{}}
            successHref="/withdraw/preflight"
            showArrow
            className="mt-7"
          >
            Check my claim
          </ActionButton>
          <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
            This runs deterministic prototype rules. AI does not decide eligibility or amounts.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">What happens now</h2>
          <div className="mt-6 space-y-6">
            {[
              [EyeIcon, "Check first", "See every passed check and anything that needs attention."],
              [ShieldCheckIcon, "Fix with context", "Know why it matters and who is responsible."],
              [CheckCircleIcon, "Review when ready", "Submit only after readiness reaches 100%."],
            ].map(([Icon, title, description]) => {
              const ItemIcon = Icon as typeof EyeIcon;
              return (
                <div key={title as string} className="grid grid-cols-[2.25rem_1fr] gap-3">
                  <ItemIcon size={24} className="text-[var(--accent)]" aria-hidden="true" />
                  <div>
                    <p className="font-semibold">{title as string}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description as string}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <PrototypeNotice />
    </div>
  );
}
