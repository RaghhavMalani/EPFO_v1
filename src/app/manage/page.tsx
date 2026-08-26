import {
  BankIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  IdentificationCardIcon,
  PhoneIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { epfoService } from "@/application/service-instance";
import { PageHeader, PrototypeNotice, StatusBadge } from "@/components/ui";
import { humanizeState } from "@/lib/format";

export const metadata = { title: "Manage PF account" };

export default function ManagePage() {
  const snapshot = epfoService.getSnapshot();
  const exitIssue = snapshot.issues.find((issue) => issue.type === "MISSING_EXIT_DATE")!;
  const profileChecks = [
    ["Core identity", snapshot.member.identity.identityStatus, IdentificationCardIcon],
    ["Aadhaar", snapshot.member.identity.aadhaarStatus, IdentificationCardIcon],
    ["PAN", snapshot.member.identity.panStatus, IdentificationCardIcon],
    ["Mobile", snapshot.member.identity.mobileStatus, PhoneIcon],
    ["Bank / NPCI", snapshot.member.identity.bankStatus, BankIcon],
  ] as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        eyebrow="Manage"
        title="Manage profile and PF records"
        description="Keep the synthetic profile, employment details, and member records ready for online services."
      />

      <section className="py-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.025em]">Profile details</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Aadhaar-validated profile corrections usually follow member self-service in this synthetic policy model.</p>
          </div>
          <span className="text-sm font-semibold text-[var(--accent)]">{snapshot.member.uanMasked}</span>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {profileChecks.map(([label, status, Icon]) => (
            <article key={label} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
              <Icon size={23} className="text-[var(--accent)]" aria-hidden="true" />
              <p className="mt-4 text-sm font-semibold">{label}</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--success)]"><CheckCircleIcon size={15} weight="fill" aria-hidden="true" />{humanizeState(status)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 py-7 lg:grid-cols-2">
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <BriefcaseIcon size={25} className="text-[var(--accent)]" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-semibold">Employment details</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Close your last synthetic PF employment record after the waiting period.</p>
            </div>
            <StatusBadge status={exitIssue.status} />
          </div>
          <Link href="/manage/mark-exit" className="mt-6 inline-flex items-center text-sm font-semibold text-[var(--accent)] hover:underline">Open Mark Exit</Link>
        </article>

        <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-7">
          <IdentificationCardIcon size={25} className="text-[var(--accent)]" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold">PF accounts</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">View all {snapshot.member.employments.length} member records held beneath the masked synthetic UAN.</p>
          <Link href="/member" className="mt-6 inline-flex items-center text-sm font-semibold text-[var(--accent)] hover:underline">View employment and PF history</Link>
        </article>
      </section>

      <section className="mt-7 rounded-2xl border border-[var(--info-line)] bg-[var(--info-soft)] p-5 sm:p-6">
        <h2 className="font-semibold">Bank verification does not use employer approval</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">In this prototype, synthetic bank details route to member input and Bank / NPCI verification. They never create an employer request.</p>
      </section>
      <div className="mt-9"><PrototypeNotice compact /></div>
    </div>
  );
}
