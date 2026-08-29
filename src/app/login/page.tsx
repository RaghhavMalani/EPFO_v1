import { BuildingsIcon, IdentificationCardIcon, ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { Suspense } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { LoginCard } from "@/components/login-card";
import { TourStartCard } from "@/components/tour-start";
import { EMPLOYER_IDENTITY, MEMBER_IDENTITY } from "@/fixtures/demo-identities";
import { T } from "@/lib/i18n/t";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="login-shell">
      <div className="login-shell__inner">
        <div className="login-language-toggle">
          <LanguageToggle />
        </div>

        <header className="login-hero">
          <span className="login-hero__mark" aria-hidden="true">E1</span>
          <h1><T id="login.brand" /></h1>
          <p><T id="login.subtitle" /></p>
        </header>

        <TourStartCard />

        <p className="login-divider"><span>or sign in as either identity</span></p>

        <Suspense fallback={<div className="login-grid" aria-hidden="true" />}>
          <div className="login-grid">
            <LoginCard
              role="member"
              name={MEMBER_IDENTITY.name}
              idLabel={MEMBER_IDENTITY.signInLabel}
              idValue={MEMBER_IDENTITY.signInId}
              icon={<IdentificationCardIcon size={22} weight="fill" aria-hidden="true" />}
            />
            <LoginCard
              role="employer"
              name={EMPLOYER_IDENTITY.name}
              idLabel={EMPLOYER_IDENTITY.signInLabel}
              idValue={EMPLOYER_IDENTITY.signInId}
              icon={<BuildingsIcon size={22} weight="fill" aria-hidden="true" />}
            />
          </div>
        </Suspense>

        <aside className="login-notice">
          <ShieldCheckIcon size={20} weight="fill" aria-hidden="true" />
          <p>
            <T id="login.notice" />
          </p>
        </aside>
      </div>
    </div>
  );
}
