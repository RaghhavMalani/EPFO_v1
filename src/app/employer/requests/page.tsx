import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { epfoService } from "@/application/service-instance";
import { PageHeader, StatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Employer requests" };

export default function EmployerRequestsPage() {
  const snapshot = epfoService.getSnapshot();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader eyebrow="Employer workspace" title="Member requests" description="Review synthetic member record changes with an explicit status and next action." backHref="/employer" backLabel="Employer home" />
      <section className="py-9">
        <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
          {snapshot.employerRequests.map((request, index) => (
            <Link key={request.id} href={`/employer/requests/${request.id}`} className={`grid gap-4 p-5 sm:grid-cols-[1fr_0.55fr_auto] sm:items-center sm:p-6 ${index > 0 ? "border-t border-[var(--line)]" : ""}`}>
              <div><p className="font-semibold">{request.memberName}</p><p className="mt-1 text-sm text-[var(--muted)]">{request.title} · {request.relatedJourney}</p></div>
              <div><p className="text-xs text-[var(--muted)]">Submitted</p><p className="mt-1 text-sm font-semibold">{formatDateTime(request.submittedAt)}</p></div>
              <div className="flex items-center gap-3"><StatusBadge status={request.status} /><ArrowRightIcon size={18} className="text-[var(--accent)]" aria-hidden="true" /></div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
