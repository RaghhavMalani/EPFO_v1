import { BuildingsIcon, IdentificationCardIcon, ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { Suspense } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { LoginCard } from "@/components/login-card";
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

        <Suspense fallback={<div className="login-grid" aria-hidden="true" />}>
          <div className="login-grid">
            <LoginCard
              role="member"
              name="Aarav Sharma"
              idLabel="UAN"
              idValue="100200304821"
              icon={<IdentificationCardIcon size={22} weight="fill" aria-hidden="true" />}
            />
            <LoginCard
              role="employer"
              name="Demo Systems Pvt Ltd"
              idLabel="Establishment ID"
              idValue="DL-DEM-2712"
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
