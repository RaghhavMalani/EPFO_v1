import { ArrowRightIcon, InfoIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { epfoService } from "@/application/service-instance";
import { PageHeader, PrototypeNotice } from "@/components/ui";

export const metadata = { title: "Online Services" };

const groups = [
  {
    title: "Claims and withdrawals",
    description: "File or track eligible benefit claims.",
    services: [
      { title: "Final PF settlement", detail: "Form 19 · Run seven checks before filing", href: "/withdraw", status: "Available" },
      { title: "PF advance", detail: "Form 31 · Goal-based partial withdrawal", href: "/advance", status: "Available" },
      { title: "Pension withdrawal benefit", detail: "Form 10C · Prototype preview", status: "Preview" },
      { title: "Track a claim", detail: "Active and past claims in one ledger", href: "/claims", status: "Available" },
    ],
  },
  {
    title: "Employment and transfers",
    description: "Keep service records aligned across employers.",
    services: [
      { title: "Transfer PF after changing jobs", detail: "Form 13 · Consolidate a previous PF account", href: "/transfer", status: "Available" },
      { title: "Mark Date of Exit", detail: "Member self-service for an eligible exit", href: "/manage/mark-exit", status: "Available" },
      { title: "Service history", detail: "Review all member records under this UAN", href: "/member", status: "Available" },
    ],
  },
  {
    title: "Account services",
    description: "Maintain identity and benefit information.",
    services: [
      { title: "Profile and KYC details", detail: "Identity, Aadhaar, PAN, mobile, and bank", href: "/manage", status: "Available" },
      { title: "Pension & retirement projection", detail: "EPS estimate and compounding corpus projection", href: "/pension", status: "Available" },
      { title: "e-Nomination", detail: "Add or update your nominee", href: "/manage/nomination", status: "Available" },
      { title: "Account correction", detail: "Route a correction to the right responsible party", href: "/manage", status: "Available" },
    ],
  },
] as const;

export default function OnlineServicesPage() {
  const snapshot = epfoService.getSnapshot();
  return (
    <div className="page-shell">
      <PageHeader eyebrow="Member" title="Online Services" description="Choose a service by outcome. Each available journey explains the form, readiness, and responsible party before you act." />
      <div className="service-groups">
        {groups.map((group) => (
          <section key={group.title} className="service-group">
            <div className="service-group__intro"><h2>{group.title}</h2><p>{group.description}</p></div>
            <div className="service-list panel">
              {group.services.map((service) => {
                const content = <><span><strong>{service.title}</strong><small>{service.detail}</small></span><span className={service.status === "Available" ? "service-availability" : "service-availability service-availability--preview"}>{service.status}</span>{"href" in service ? <ArrowRightIcon size={17} aria-hidden="true" /> : <span aria-hidden="true" />}</>;
                return "href" in service ? <Link key={service.title} href={service.href!} className="service-row link-row">{content}</Link> : <div key={service.title} className="service-row service-row--disabled">{content}</div>;
              })}
            </div>
          </section>
        ))}
      </div>
      <aside className="journey-note"><InfoIcon size={18} weight="fill" aria-hidden="true" /><p><strong>Current guided journey: Final PF settlement · Form 19</strong><span>{snapshot.withdrawalService.explanation} Current readiness is {snapshot.readiness.passedCount} of {snapshot.readiness.totalChecks} checks.</span></p></aside>
      <PrototypeNotice compact />
    </div>
  );
}
