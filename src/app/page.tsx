import {
  ArrowRightIcon,
  ArrowsLeftRightIcon,
  CheckCircleIcon,
  IdentificationCardIcon,
  MagnifyingGlassIcon,
  PiggyBankIcon,
  TargetIcon,
  WrenchIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { LinkButton, PrototypeNotice } from "@/components/ui";

const goals = [
  {
    label: "Withdraw my PF",
    description: "Check readiness before you file.",
    href: "/withdraw",
    available: true,
    Icon: PiggyBankIcon,
  },
  {
    label: "I changed jobs",
    description: "Bring older PF records together.",
    available: false,
    Icon: ArrowsLeftRightIcon,
  },
  {
    label: "Fix my PF account",
    description: "Find and resolve record gaps.",
    available: false,
    Icon: WrenchIcon,
  },
  {
    label: "Track my claim",
    description: "See who is acting and what comes next.",
    href: "/claims/claim-demo-001",
    available: true,
    Icon: MagnifyingGlassIcon,
  },
  {
    label: "Plan retirement",
    description: "Understand your longer-term PF path.",
    available: false,
    Icon: TargetIcon,
  },
  {
    label: "Update my details",
    description: "Keep profile information current.",
    available: false,
    Icon: IdentificationCardIcon,
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="grid min-h-[calc(100dvh-7rem)] items-center gap-10 py-12 md:grid-cols-[1.08fr_0.92fr] md:py-16">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
            Start with your goal
          </p>
          <h1 className="mt-4 max-w-2xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-[var(--ink)] sm:text-6xl md:text-7xl">
            Your PF, without the guesswork.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">
            Tell us what you need. We&apos;ll check your account first, show anything that could block you, and guide you through the next step.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/withdraw">Withdraw my PF</LinkButton>
            <LinkButton href="/member" variant="secondary">
              View synthetic profile
            </LinkButton>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] sm:p-8">
          <p className="text-sm font-semibold text-[var(--accent)]">One guided journey</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">Know what happens before you claim.</h2>
          <div className="mt-8 space-y-7">
            {[
              ["Know before you claim", "Run deterministic checks before filing anything."],
              ["Fix before you fail", "See the exact record, responsible party, and next action."],
              ["Track until you are paid", "Follow every simulated handoff through bank credit."],
            ].map(([title, description]) => (
              <div key={title} className="grid grid-cols-[2rem_1fr] gap-3">
                <CheckCircleIcon
                  size={24}
                  weight="fill"
                  className="mt-0.5 text-[var(--accent)]"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--line)] py-14 sm:py-20">
        <h2 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">What do you need to do?</h2>
        <p className="mt-3 max-w-xl leading-7 text-[var(--muted)]">
          Choose a goal in plain language. The withdrawal journey is complete in this prototype.
        </p>
        <div className="mt-9 grid gap-4 sm:grid-cols-2">
          {goals.map(({ label, description, href, available, Icon }, index) => {
            const content = (
              <>
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Icon size={23} aria-hidden="true" />
                  </span>
                  {available ? (
                    <ArrowRightIcon size={20} className="text-[var(--accent)]" aria-hidden="true" />
                  ) : (
                    <span className="rounded-lg bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">
                      Coming in prototype
                    </span>
                  )}
                </div>
                <h3 className="mt-6 text-xl font-semibold tracking-[-0.02em]">{label}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
              </>
            );

            return href ? (
              <Link
                key={label}
                href={href}
                className={`rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:shadow-[var(--shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${index === 0 ? "sm:col-span-2" : ""}`}
              >
                {content}
              </Link>
            ) : (
              <div key={label} className="rounded-2xl border border-[var(--line)] p-5 opacity-70">
                {content}
              </div>
            );
          })}
        </div>
      </section>

      <section className="pb-4">
        <PrototypeNotice />
      </section>
    </div>
  );
}
