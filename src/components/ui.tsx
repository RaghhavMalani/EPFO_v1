import { CheckCircleIcon, ClockIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import type { EmployerRequestStatus, IssueStatus } from "@/domain/schemas";
import { humanizeState } from "@/lib/format";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  aside?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, backHref, backLabel = "Back", aside }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        {backHref ? <Link href={backHref} className="back-link">← {backLabel}</Link> : null}
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="page-header__description">{description}</p> : null}
      </div>
      {aside ? <div className="page-header__aside">{aside}</div> : null}
    </header>
  );
}

export function LinkButton({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  return <Link href={href} className={buttonClassName(variant)}>{children}</Link>;
}

export function buttonClassName(variant: "primary" | "secondary" | "danger" = "primary") {
  const shared = "inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-[background-color,color,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] disabled:cursor-not-allowed disabled:opacity-50";
  if (variant === "secondary") return `${shared} border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-muted)]`;
  if (variant === "danger") return `${shared} border border-[var(--danger)] bg-[var(--surface)] text-[var(--danger)] hover:bg-[var(--danger-soft)]`;
  return `${shared} border border-[var(--accent-fill)] bg-[var(--accent-fill)] text-white hover:border-[var(--accent-strong)] hover:bg-[var(--accent-strong)]`;
}

export function StatusBadge({ status }: { status: IssueStatus | EmployerRequestStatus | "PASS" | "BLOCK" | "WARNING" }) {
  const isPositive = status === "PASS" || status === "RESOLVED" || status === "APPROVED";
  const isWaiting = status === "WAITING_EXTERNAL" || status === "AWAITING_REVIEW" || status === "IN_REVIEW";
  const isBlock = status === "BLOCK" || status === "REJECTED";
  const Icon = isPositive ? CheckCircleIcon : isWaiting ? ClockIcon : WarningCircleIcon;
  const tone = isPositive ? "status-badge--success" : isWaiting ? "status-badge--info" : isBlock ? "status-badge--danger" : "status-badge--warning";
  const label = status === "BLOCK" || status === "OPEN" ? "Action required" : humanizeState(status);
  return <span className={`status-badge ${tone}`}><Icon size={14} weight="fill" aria-hidden="true" />{label}</span>;
}

export function PrototypeNotice({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={`prototype-notice ${compact ? "prototype-notice--compact" : ""}`}>
      <p className="font-semibold text-[var(--ink)]">Independent prototype · Synthetic data only</p>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Use only the synthetic persona shown. Never enter a real UAN, Aadhaar, PAN, bank account, OTP, or government credential.</p>
    </aside>
  );
}

export function Definition({ term, children }: { term: string; children: ReactNode }) {
  return <div><dt className="record-label">{term}</dt><dd className="mt-1 text-sm leading-6 text-[var(--ink)]">{children}</dd></div>;
}
