import { CheckCircleIcon, MegaphoneIcon } from "@phosphor-icons/react/dist/ssr";
import { epfoService } from "@/application/service-instance";
import { NominationForm } from "@/components/nomination-form";
import { PageHeader, PrototypeNotice } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "e-Nomination" };

export default function NominationPage() {
  const { member } = epfoService.getSnapshot();
  const { nomination } = member;

  return (
    <div className="page-shell page-shell--narrow">
      <PageHeader
        eyebrow="Manage · e-Nomination"
        title="Add or update your nominee"
        description="Nominate who receives your PF, EPS, and insurance benefits if something happens to you. This is one of EPFO's most-repeated public reminders — most members never complete it."
        backHref="/manage"
        backLabel="Manage"
      />

      <aside className="mt-8 flex gap-3 rounded-2xl border border-[var(--info-line)] bg-[var(--info-soft)] p-5">
        <MegaphoneIcon size={22} weight="fill" className="shrink-0 text-[var(--info)]" aria-hidden="true" />
        <div>
          <p className="font-semibold text-[var(--ink)]">Why this matters</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Without a nomination on file, your family may face delays and extra paperwork to claim your PF, pension, and insurance benefits. EPFO runs recurring public campaigns urging members to complete this — it takes minutes.
          </p>
        </div>
      </aside>

      {nomination.status === "SAVED" ? (
        <section className="mt-8 flex gap-3 rounded-2xl border border-[var(--success)] bg-[var(--success-soft)] p-5">
          <CheckCircleIcon size={22} weight="fill" className="shrink-0 text-[var(--success)]" aria-hidden="true" />
          <div>
            <p className="font-semibold text-[var(--ink)]">Nomination on file</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Last saved {nomination.updatedAt ? formatDateTime(nomination.updatedAt) : "recently"}. Edit and save again to update it.
            </p>
          </div>
        </section>
      ) : null}

      <section className="py-8">
        <h2 className="section-title">{nomination.status === "SAVED" ? "Edit your nominees" : "Add your nominees"}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Shares across all nominees must add up to exactly 100%.</p>
        <div className="mt-6">
          <NominationForm existing={nomination.nominees} />
        </div>
      </section>

      <PrototypeNotice compact />
    </div>
  );
}
