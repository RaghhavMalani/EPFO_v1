"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClassName } from "@/components/ui";

async function postTransfer(body: Record<string, unknown>) {
  const response = await fetch("/api/actions/transfer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(result.error ?? "This mock action could not be completed.");
  }
}

export function TransferActionButton({
  action,
  label,
  variant = "primary",
}: {
  action: "RESOLVE_BLOCKER" | "ADVANCE";
  label: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setIsPending(true);
    try {
      await postTransfer({ action });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "This mock action could not be completed.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={run} disabled={isPending} className={buttonClassName(variant)}>
        {isPending ? "Working…" : label}
      </button>
      {error ? <p role="alert" className="mt-2 text-sm font-medium text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
