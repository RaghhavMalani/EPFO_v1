import {
  CheckCircleIcon,
  ClockIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
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

export function PageHeader({
  eyebrow,
  title,
  description,
  backHref,
  backLabel = "Back",
  aside,
}: PageHeaderProps) {
  return (
    <header className="grid gap-6 border-b border-[var(--line)] pb-8 md:grid-cols-[1fr_auto] md:items-end">
      <div>
        {backHref ? (
          <Link
            href={backHref}
            className="mb-5 inline-flex rounded-md text-sm font-medium text-[var(--accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            ← {backLabel}
          </Link>
        ) : null}
        {eyebrow ? (
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="max-w-3xl text-3xl font-semibold leading-[1.08] tracking-[-0.035em] text-[var(--ink)] sm:text-4xl md:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
            {description}
          </p>
        ) : null}
      </div>
      {aside}
    </header>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={buttonClassName(variant)}
    >
      {children}
    </Link>
  );
}

export function buttonClassName(variant: "primary" | "secondary" | "danger" = "primary") {
  const shared =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold whitespace-nowrap transition-[transform,background-color,color,border-color] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] disabled:cursor-not-allowed disabled:opacity-45";
  if (variant === "secondary") {
    return `${shared} border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-muted)]`;
  }
  if (variant === "danger") {
    return `${shared} border border-[var(--danger)] bg-transparent text-[var(--danger)] hover:bg-[var(--danger-soft)]`;
  }
  return `${shared} bg-[var(--accent-fill)] text-white hover:bg-[var(--accent-strong)]`;
}

export function StatusBadge({ status }: { status: IssueStatus | EmployerRequestStatus | "PASS" | "BLOCK" | "WARNING" }) {
  const isPositive = status === "PASS" || status === "RESOLVED" || status === "APPROVED";
  const isWaiting = status === "WAITING_EXTERNAL" || status === "AWAITING_REVIEW" || status === "IN_REVIEW";
  const Icon = isPositive ? CheckCircleIcon : isWaiting ? ClockIcon : WarningCircleIcon;
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
        isPositive
          ? "bg-[var(--success-soft)] text-[var(--success)]"
          : isWaiting
            ? "bg-[var(--info-soft)] text-[var(--info)]"
            : "bg-[var(--warning-soft)] text-[var(--warning)]"
      }`}
    >
      <Icon size={15} weight="fill" aria-hidden="true" />
      {humanizeState(status)}
    </span>
  );
}

export function PrototypeNotice({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      className={`rounded-2xl border border-[var(--info-line)] bg-[var(--info-soft)] text-[var(--ink)] ${compact ? "p-4" : "p-5 sm:p-6"}`}
    >
      <p className="font-semibold">Everything here is simulated</p>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
        Use only the synthetic persona shown. Never enter a real UAN, Aadhaar, PAN, bank account, OTP, or government credential.
      </p>
    </aside>
  );
}

export function Definition({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {term}
      </dt>
      <dd className="mt-1.5 text-sm leading-6 text-[var(--ink)]">{children}</dd>
    </div>
  );
}
