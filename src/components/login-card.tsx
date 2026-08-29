"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, type ReactNode, useState } from "react";
import { buttonClassName } from "@/components/ui";
import { DEMO_PASSWORD, ROLE_HOME, type Role } from "@/lib/auth";

type LoginCardProps = {
  role: Role;
  badge: string;
  name: string;
  idLabel: string;
  idValue: string;
  icon: ReactNode;
};

export function LoginCard({ role, badge, name, idLabel, idValue, icon }: LoginCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, password }),
    });
    const result = (await response.json()) as { redirectTo?: string; error?: string };
    if (!response.ok) {
      setIsPending(false);
      setError(result.error ?? "Sign-in failed.");
      return;
    }
    const next = searchParams.get("next");
    const destination = next && next.startsWith("/") ? next : (result.redirectTo ?? ROLE_HOME[role]);
    router.push(destination);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="login-card panel" aria-labelledby={`login-card-${role}-name`}>
      <div className="login-card__head">
        <span className="login-card__icon" aria-hidden="true">{icon}</span>
        <span className="login-card__badge">{badge}</span>
      </div>
      <h2 id={`login-card-${role}-name`}>{name}</h2>
      <p className="login-card__identifier tabular">{idLabel} · {idValue}</p>

      <label className="login-card__field">
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="off"
          placeholder="Enter the demo password"
          required
        />
      </label>

      {error ? (
        <p role="alert" className="login-card__error">{error}</p>
      ) : null}

      <div className="login-card__actions">
        <button
          type="button"
          onClick={() => setPassword(DEMO_PASSWORD)}
          className={buttonClassName("secondary")}
        >
          Use demo credentials
        </button>
        <button type="submit" disabled={isPending} className={buttonClassName("primary")}>
          {isPending ? "Signing in…" : `Sign in as ${badge.toLowerCase()}`}
          {!isPending ? <ArrowRightIcon size={18} aria-hidden="true" /> : null}
        </button>
      </div>
    </form>
  );
}
