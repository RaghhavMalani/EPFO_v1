"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { T, useTranslation } from "@/lib/i18n/t";

const employerNavigation = [
  { href: "/employer", label: "Overview" },
  { href: "/employer#members", label: "Members" },
  { href: "/employer#establishment", label: "Establishment", mobileHidden: true },
  { href: "/employer/ecr", label: "Payments", mobileHidden: true },
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

function SignOutButton() {
  const router = useRouter();
  const t = useTranslation();
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={isPending}
      className="role-switch role-switch--button"
    >
      {isPending ? "Signing out…" : t("nav.signOut")}
    </button>
  );
}

export function AppHeader({ member }: { member: MemberIdentity }) {
  const pathname = usePathname();
  const t = useTranslation();
  const isEmployer = pathname.startsWith("/employer");
  const memberNavigation = [
    { href: "/", label: t("nav.home") },
    { href: "/passbook", label: t("nav.passbook") },
    { href: "/member", label: t("nav.employment"), mobileLabel: t("nav.jobs") },
    { href: "/online-services", label: t("nav.services") },
    { href: "/manage", label: t("nav.manage") },
  ];
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
                  <SignOutButton />
                </>
              ) : (
                <>
                  <div><strong>{member.name}</strong><span>UAN · {member.uanMasked}</span></div>
                  <LanguageToggle />
                  <SignOutButton />
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
        <Link href="/demo" className="app-footer__demo-link"><T id="nav.demoControls" /></Link>
      </div>
    </footer>
  );
}
