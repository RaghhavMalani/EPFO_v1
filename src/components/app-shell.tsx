import Link from "next/link";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/member", label: "My PF" },
  { href: "/claims/claim-demo-001", label: "Track claim" },
  { href: "/demo", label: "Demo controls" },
];

export function AppHeader() {
  return (
    <>
      <div className="border-b border-[var(--line)] bg-[var(--safety)] px-4 py-2 text-center text-xs font-medium text-[var(--muted)]">
        Independent prototype · Synthetic data
      </div>
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[color:var(--canvas)/0.94] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-5 px-4 sm:px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 rounded-lg font-semibold tracking-[-0.02em] text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <span className="grid size-8 place-items-center rounded-[10px] bg-[var(--accent-fill)] text-xs font-bold text-white">
              E1
            </span>
            <span>EPFO One</span>
          </Link>
          <nav aria-label="Primary" className="overflow-x-auto">
            <ul className="flex min-w-max items-center gap-1">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
    </>
  );
}

export function AppFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--line)]">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 text-sm text-[var(--muted)] sm:px-6 md:grid-cols-[1fr_auto]">
        <div>
          <p className="font-semibold text-[var(--ink)]">EPFO One</p>
          <p className="mt-1">Know before you claim. Fix before you fail. Track until you&apos;re paid.</p>
        </div>
        <p className="max-w-md md:text-right">
          Independent hackathon prototype. No government, bank, Aadhaar, PAN, employer, or OTP systems are connected.
        </p>
      </div>
    </footer>
  );
}
