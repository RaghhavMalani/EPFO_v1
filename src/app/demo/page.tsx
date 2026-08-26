import {
  BugIcon,
  CheckCircleIcon,
  ClockCounterClockwiseIcon,
  WarningIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { epfoService } from "@/application/service-instance";
import { ActionButton } from "@/components/action-button";
import { PageHeader, StatusBadge } from "@/components/ui";
import { CLAIM_SEQUENCE } from "@/domain/claim-machine";
import type { ClaimState } from "@/domain/schemas";
import { formatDateTime, humanizeState } from "@/lib/format";

export const metadata = { title: "Demo controls" };

const claimControls: Array<{
  action: string;
  label: string;
  requiredState: ClaimState;
}> = [
  { action: "VERIFY_ELIGIBILITY", label: "Advance claim to eligibility verified", requiredState: "SUBMITTED" },
  { action: "VERIFY_RECORDS", label: "Advance claim to records verified", requiredState: "ELIGIBILITY_VERIFIED" },
  { action: "APPROVE_CLAIM", label: "Approve claim", requiredState: "RECORDS_VERIFIED" },
  {
    action: "CREATE_PAYMENT_INSTRUCTION",
    label: "Generate payment instruction",
    requiredState: "APPROVED",
  },
  {
    action: "SEND_TO_BANK",
    label: "Send payment to bank",
    requiredState: "PAYMENT_INSTRUCTION_CREATED",
  },
  { action: "CREDIT_PAYMENT", label: "Simulate bank credit", requiredState: "BANK_PROCESSING" },
];

export default function DemoPage() {
  const snapshot = epfoService.getSnapshot();
  const exitIssue = snapshot.issues.find((issue) => issue.id === "issue-exit-date");
  const balanceIssue = snapshot.issues.find((issue) => issue.id === "issue-old-balance");
  const claimIndex = CLAIM_SEQUENCE.indexOf(snapshot.claim.state);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        eyebrow="Internal simulation"
        title="Demo control panel"
        description="A simulation and debug control surface for triggering synthetic employer, processing, and bank events."
        aside={
          <span className="inline-flex items-center gap-2 rounded-xl bg-[var(--warning-soft)] px-3 py-2 text-sm font-semibold text-[var(--warning)]">
            <BugIcon size={18} weight="fill" aria-hidden="true" />
            Not a citizen screen
          </span>
        }
      />

      <aside className="mt-8 flex gap-3 rounded-2xl border border-[var(--warning)] bg-[var(--warning-soft)] p-5">
        <WarningIcon size={25} weight="fill" className="shrink-0 text-[var(--warning)]" aria-hidden="true" />
        <div>
          <p className="font-semibold">Simulation only</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            These controls write only to the typed in-memory repository. They do not contact EPFO, employers, Aadhaar, PAN services, or banks.
          </p>
        </div>
      </aside>

      <section className="grid gap-5 py-9 sm:grid-cols-3">
        <div className="rounded-2xl bg-[var(--accent-fill)] p-5 text-white">
          <p className="text-sm text-white/75">Readiness</p>
          <p className="mt-2 text-4xl font-semibold tracking-[-0.04em]">{snapshot.readiness.percentage}%</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Claim state</p>
          <p className="mt-2 font-semibold">{humanizeState(snapshot.claim.state)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Audit events</p>
          <p className="mt-2 text-2xl font-semibold">{snapshot.auditEvents.length}</p>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-xl font-semibold">Resolve preflight issues</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Each action updates the issue and its related employment record through a mock adapter.
          </p>
          <div className="mt-6 space-y-5">
            <div className="border-b border-[var(--line)] pb-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold">Date of Exit correction</p>
                {exitIssue ? <StatusBadge status={exitIssue.status} /> : null}
              </div>
              <ActionButton
                endpoint="/api/demo"
                body={{ action: "RESOLVE_EXIT" }}
                disabled={exitIssue?.status === "RESOLVED"}
                variant="secondary"
                className="mt-4"
              >
                Simulate employer accepting Date of Exit correction
              </ActionButton>
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold">Old PF balance</p>
                {balanceIssue ? <StatusBadge status={balanceIssue.status} /> : null}
              </div>
              <ActionButton
                endpoint="/api/demo"
                body={{ action: "RECONCILE_BALANCE" }}
                disabled={balanceIssue?.status === "RESOLVED"}
                variant="secondary"
                className="mt-4"
              >
                Simulate old PF balance reconciliation
              </ActionButton>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-xl font-semibold">Advance claim processing</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Only the next legal state can run. The claim cannot skip a transition.
          </p>
          {snapshot.claim.state === "READY" ? (
            <div className="mt-5 rounded-xl bg-[var(--accent-soft)] p-4 text-sm leading-6">
              <p className="font-semibold">Citizen confirmation required</p>
              <p className="mt-1 text-[var(--muted)]">
                <Link href="/withdraw/review" className="font-semibold text-[var(--accent)] hover:underline">
                  Review and submit the mock claim
                </Link>{" "}
                before using processing controls.
              </p>
            </div>
          ) : null}
          <div className="mt-6 space-y-3">
            {claimControls.map((control) => {
              const requiredIndex = CLAIM_SEQUENCE.indexOf(control.requiredState);
              const completed = claimIndex > requiredIndex;
              return (
                <div key={control.action} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="flex items-center gap-2 text-sm">
                    {completed ? (
                      <CheckCircleIcon size={18} weight="fill" className="text-[var(--success)]" aria-hidden="true" />
                    ) : (
                      <span className="size-[18px] rounded-full border border-[var(--line-strong)]" aria-hidden="true" />
                    )}
                    <span className={completed ? "text-[var(--muted)]" : "font-medium"}>{control.label}</span>
                  </div>
                  <ActionButton
                    endpoint="/api/demo"
                    body={{ action: control.action }}
                    disabled={snapshot.claim.state !== control.requiredState}
                    variant="secondary"
                  >
                    Run
                  </ActionButton>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="mt-9 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Recent audit events</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Every domain transition leaves a trace.</p>
          </div>
          <ActionButton
            endpoint="/api/demo"
            body={{ action: "RESET" }}
            variant="danger"
          >
            <ClockCounterClockwiseIcon size={18} aria-hidden="true" />
            Reset simulation
          </ActionButton>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {snapshot.auditEvents.slice(-8).toReversed().map((event) => (
            <article key={event.id} className="rounded-xl bg-[var(--surface-muted)] p-4">
              <p className="text-sm font-semibold">{humanizeState(event.eventType)}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                {event.actorName} · {formatDateTime(event.timestamp)}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
