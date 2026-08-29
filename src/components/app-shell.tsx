"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const memberNavigation = [
  { href: "/", label: "Home" },
  { href: "/passbook", label: "Passbook" },
  { href: "/member", label: "Employment", mobileLabel: "Jobs" },
  { href: "/online-services", label: "Services" },
  { href: "/manage", label: "Manage" },
];

const employerNavigation = [
  { href: "/employer", label: "Overview" },
  { href: "/employer#members", label: "Members" },
  { href: "/employer#establishment", label: "Establishment", mobileHidden: true },
  { href: "/employer#payments", label: "Payments", mobileHidden: true },
  { href: "/employer/requests", label: "Requests" },
  { href: "/employer#reports", label: "Reports", mobileHidden: true },
];

function isCurrent(pathname: string, href: string) {
  const path = href.split("#")[0];
  if (path === "/") return pathname === "/";
  if (path === "/employer") return pathname === "/employer";
  return pathname === path || pathname.startsWith(`${path}/`);
}

export type MemberIdentity = { name: string; uanMasked: string };

export function AppHeader({ member }: { member: MemberIdentity }) {
  const pathname = usePathname();
  const isEmployer = pathname.startsWith("/employer");
  const navigation = isEmployer ? employerNavigation : memberNavigation;

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header className={isEmployer ? "app-header app-header--employer" : "app-header"}>
        <div className="app-identity">
          <div className="shell-width app-identity__inner">
            <Link href={isEmployer ? "/employer" : "/"} className="brand-link" aria-label="EPFO One home">
              <span className="brand-mark" aria-hidden="true">E1</span>
              <span className="brand-name">EPFO ONE</span>
            </Link>
            <span className="brand-divider" aria-hidden="true" />
            <p className="brand-context">{isEmployer ? "Employer services" : "Independent redesign of Unified Member Services"}</p>
            <div className="identity-meta">
              {isEmployer ? (
                <>
                  <div><strong>Demo Systems Pvt Ltd</strong><span>Establishment ID · DLCPM••••6789</span></div>
                  <Link href="/" className="role-switch">Switch to member</Link>
                </>
              ) : (
                <>
                  <div><strong>{member.name}</strong><span>UAN · {member.uanMasked}</span></div>
                  <Link href="/employer" className="role-switch">Employer role</Link>
                </>
              )}
            </div>
          </div>
        </div>
        <nav aria-label={isEmployer ? "Employer" : "Member"} className="app-navigation">
          <div className="shell-width app-navigation__scroller">
            {navigation.map((item) => {
              const current = isCurrent(pathname, item.href);
              return (
                <Link key={`${item.href}-${item.label}`} href={item.href} className={`${current ? "nav-link nav-link--current" : "nav-link"}${"mobileHidden" in item && item.mobileHidden ? " nav-link--mobile-hidden" : ""}`} aria-current={current ? "page" : undefined}>
                  <span className="nav-label--desktop">{item.label}</span>
                  <span className="nav-label--mobile">{"mobileLabel" in item ? item.mobileLabel : item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
    </>
  );
}

export function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="shell-width app-footer__inner">
        <p><strong>EPFO ONE</strong> · Independent prototype</p>
        <p>Synthetic data only · No government, bank, Aadhaar, PAN, employer, or OTP systems are connected.</p>
      </div>
    </footer>
  );
}
