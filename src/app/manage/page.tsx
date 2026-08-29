import { ArrowRightIcon, CheckCircleIcon, InfoIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { epfoService } from "@/application/service-instance";
import { PageHeader, PrototypeNotice, StatusBadge } from "@/components/ui";
import { humanizeState } from "@/lib/format";

export const metadata = { title: "Manage account" };

export default function ManagePage() {
  const snapshot = epfoService.getSnapshot();
  const exitIssue = snapshot.issues.find((issue) => issue.type === "MISSING_EXIT_DATE")!;
  const profileChecks = [
    ["Core identity", snapshot.member.identity.identityStatus, "Name, date of birth, and gender"],
    ["Aadhaar", snapshot.member.identity.aadhaarStatus, "Identity link and demographic match"],
    ["PAN", snapshot.member.identity.panStatus, "Tax identity for eligible claims"],
    ["Mobile", snapshot.member.identity.mobileStatus, "Registered contact number"],
    ["Bank and NPCI", snapshot.member.identity.bankStatus, "Verified payment destination"],
  ] as const;

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Manage" title="Profile and PF records" description="Keep your identity, contact, bank, nomination, and employment information ready for online services." aside={<span className="uan-context tabular">{snapshot.member.uanMasked}</span>} />

      <div className="manage-layout">
        <section>
          <div><p className="record-label">Identity and account</p><h2 className="section-title">Verified details</h2></div>
          <div id="account" className="settings-group panel">
            {profileChecks.map(([label, status, description]) => (
              <div key={label} className="setting-row">
                <CheckCircleIcon size={18} weight="fill" className="text-[var(--success)]" aria-hidden="true" />
                <span><strong>{label}</strong><small>{description}</small></span>
                <span className="setting-status">{humanizeState(status)}</span>
                <span className="setting-action">Up to date</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div><p className="record-label">Employment</p><h2 className="section-title">PF records</h2></div>
          <div className="settings-group panel">
            <Link href="/manage/mark-exit" className="setting-row setting-row--link link-row">
              <WarningCircleIcon size={18} weight="fill" className="text-[var(--warning)]" aria-hidden="true" />
              <span><strong>Last employment exit</strong><small>Record the missing Date of Exit after the waiting period</small></span>
              <StatusBadge status={exitIssue.status} />
              <span className="setting-action">Open <ArrowRightIcon size={15} aria-hidden="true" /></span>
            </Link>
            <Link href="/member" className="setting-row setting-row--link link-row">
              <CheckCircleIcon size={18} weight="fill" className="text-[var(--success)]" aria-hidden="true" />
              <span><strong>Linked member records</strong><small>{snapshot.member.employments.length} employment records under this UAN</small></span>
              <span className="setting-status">Available</span>
              <span className="setting-action">View <ArrowRightIcon size={15} aria-hidden="true" /></span>
            </Link>
          </div>
        </section>

        <aside className="manage-note">
          <InfoIcon size={18} weight="fill" aria-hidden="true" />
          <div><strong>Bank verification does not use employer approval</strong><p>In this prototype, bank details route to member input and Bank / NPCI verification. They never create an employer request.</p></div>
        </aside>
      </div>
      <PrototypeNotice compact />
    </div>
  );
}
