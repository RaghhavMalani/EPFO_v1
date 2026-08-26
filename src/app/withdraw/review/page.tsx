import {
  BankIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { epfoService } from "@/application/service-instance";
import { ActionButton } from "@/components/action-button";
import { PageHeader, PrototypeNotice } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Review withdrawal" };

export default function ReviewPage() {
  const snapshot = epfoService.getSnapshot();
  if (!snapshot.readiness.isReady) {
    redirect("/withdraw/preflight");
  }
  if (snapshot.claim.state !== "READY") {
    redirect(`/claims/${snapshot.claim.id}`);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        title="Review your mock claim"
        description="Check the amount and destination before explicitly confirming this synthetic submission."
        backHref="/withdraw/preflight"
        backLabel="Claim Preflight"
      />

      <section className="mt-9 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
        <div className="border-b border-[var(--line)] p-6 sm:p-8">
          <p className="text-sm font-medium text-[var(--muted)]">PF withdrawal amount</p>
          <p className="mt-2 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            {formatCurrency(snapshot.claim.requestedAmountPaise)}
          </p>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
          <div className="flex gap-3">
            <BankIcon size={24} className="shrink-0 text-[var(--accent)]" aria-hidden="true" />
            <div>
              <p className="font-semibold">Verified mock destination</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Demo Bank account ending in 8042. This is not a real bank account.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <ShieldCheckIcon size={24} className="shrink-0 text-[var(--accent)]" aria-hidden="true" />
            <div>
              <p className="font-semibold">Deterministic readiness</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                All seven preflight checks passed. Readiness is {snapshot.readiness.percentage}%.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--success)] bg-[var(--success-soft)] p-5 sm:p-6">
        <div className="flex gap-3">
          <CheckCircleIcon size={24} weight="fill" className="shrink-0 text-[var(--success)]" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">Ready for your confirmation</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Selecting the button below is the explicit confirmation required to submit this mock claim.
            </p>
          </div>
        </div>
      </section>

      <ActionButton
        endpoint="/api/actions/claim"
        body={{ action: "SUBMIT", confirmed: true }}
        successHref={`/claims/${snapshot.claim.id}`}
        showArrow
        className="mt-7"
      >
        Confirm and submit mock claim
      </ActionButton>

      <div className="mt-9">
        <PrototypeNotice compact />
      </div>
    </div>
  );
}
