import { BuildingsIcon, IdentificationCardIcon, ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginCard } from "@/components/login-card";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="login-shell">
      <div className="login-shell__inner">
        <header className="login-hero">
          <span className="login-hero__mark" aria-hidden="true">E1</span>
          <h1>EPFO ONE</h1>
          <p>An independent, hackathon-built reimagining of member and employer PF services.</p>
        </header>

        <Suspense fallback={<div className="login-grid" aria-hidden="true" />}>
          <div className="login-grid">
            <LoginCard
              role="member"
              badge="Member"
              name="Aarav Sharma"
              idLabel="UAN"
              idValue="100200304821"
              icon={<IdentificationCardIcon size={22} weight="fill" aria-hidden="true" />}
            />
            <LoginCard
              role="employer"
              badge="Employer"
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
            Independent hackathon prototype · Synthetic data only — never enter real credentials.
          </p>
        </aside>
      </div>
    </div>
  );
}
