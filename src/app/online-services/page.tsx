import { ArrowRightIcon, BriefcaseIcon, IdentificationCardIcon, ListChecksIcon, PiggyBankIcon, TreeStructureIcon, UserListIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { epfoService } from "@/application/service-instance";
import { PageHeader, PrototypeNotice } from "@/components/ui";

export const metadata = { title: "Online Services" };

const services = [
  { title: "Withdraw or take an advance", description: "Choose the PF outcome you need, then run readiness checks before filing.", href: "/withdraw", detail: "Final PF settlement · Form 19", available: true, Icon: PiggyBankIcon },
  { title: "Transfer PF after changing jobs", description: "Bring eligible member records together under the same UAN.", detail: "Transfer request · Form 13", available: false, Icon: TreeStructureIcon },
  { title: "Track a claim", description: "See the current responsible party, exact action, and what happens next.", href: "/claims/claim-demo-001", detail: "Claim and payment timeline", available: true, Icon: ListChecksIcon },
  { title: "Update employment exit", description: "Record an eligible Date of Exit through member self-service.", href: "/manage/mark-exit", detail: "Manage · Mark Exit", available: true, Icon: BriefcaseIcon },
  { title: "Add or update e-Nomination", description: "Manage nominee details for eligible benefits.", detail: "e-Nomination", available: false, Icon: UserListIcon },
  { title: "Correct account details", description: "Route profile changes to self-service or the right reviewing party.", href: "/manage", detail: "Account correction", available: true, Icon: IdentificationCardIcon },
];

export default function OnlineServicesPage() {
  const snapshot = epfoService.getSnapshot();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader eyebrow="Member" title="Online Services" description="Start with your goal. EPFO One maps it to the relevant service and form inside the guided journey." />
      <section className="grid gap-4 py-9 md:grid-cols-2">
        {services.map(({ title, description, href, detail, available, Icon }) => {
          const content = <>
            <div className="flex items-start justify-between gap-4"><span className="grid size-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><Icon size={23} aria-hidden="true" /></span>{available ? <ArrowRightIcon size={20} className="text-[var(--accent)]" aria-hidden="true" /> : <span className="rounded-lg bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">Prototype preview</span>}</div>
            <h2 className="mt-6 text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
            <p className="mt-5 border-t border-[var(--line)] pt-4 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">{detail}</p>
          </>;
          return href ? <Link key={title} href={href} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-[var(--line-strong)]">{content}</Link> : <article key={title} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 opacity-75">{content}</article>;
        })}
      </section>
      <section className="rounded-2xl bg-[var(--accent-fill)] p-6 text-white sm:p-8">
        <p className="text-sm text-white/75">Current journey</p>
        <h2 className="mt-2 text-2xl font-semibold">Final PF settlement · Form 19</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">{snapshot.withdrawalService.explanation} Readiness is {snapshot.readiness.passedCount} of {snapshot.readiness.totalChecks} checks.</p>
      </section>
      <div className="mt-9"><PrototypeNotice compact /></div>
    </div>
  );
}
