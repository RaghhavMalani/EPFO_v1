"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { buttonClassName } from "@/components/ui";

type ActionButtonProps = {
  endpoint: string;
  body: Record<string, unknown>;
  children: ReactNode;
  successHref?: string;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  showArrow?: boolean;
  className?: string;
};

export function ActionButton({
  endpoint,
  body,
  children,
  successHref,
  variant = "primary",
  disabled = false,
  showArrow = false,
  className = "",
}: ActionButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function runAction() {
    setError(null);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "This mock action could not be completed.");
      return;
    }

    startTransition(() => {
      if (successHref) {
        router.push(successHref);
      }
      router.refresh();
    });
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={runAction}
        disabled={disabled || isPending}
        className={buttonClassName(variant)}
      >
        {isPending ? "Working…" : children}
        {showArrow && !isPending ? <ArrowRightIcon size={18} aria-hidden="true" /> : null}
      </button>
      {error ? (
        <p role="alert" className="mt-2 max-w-md text-sm font-medium text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
