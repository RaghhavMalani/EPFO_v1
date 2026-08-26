"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClassName } from "@/components/ui";

export function EmployerDecisionForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function decide(action: "APPROVE" | "REQUEST_INFORMATION" | "REJECT") {
    setError(null);
    const needsReason = action !== "APPROVE";
    if (needsReason && reason.trim().length < 5) {
      setError("Enter a clear reason of at least 5 characters.");
      return;
    }
    const response = await fetch(`/api/employer/requests/${requestId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(needsReason ? { action, reason } : { action }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "The synthetic employer action could not be completed.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <label htmlFor="employer-reason" className="text-sm font-semibold">Reason for requesting information or rejecting</label>
      <textarea
        id="employer-reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={4}
        placeholder="Explain what the member needs to know."
        className="mt-2 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--canvas)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
      />
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">This reason appears in the member&apos;s issue history.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" disabled={isPending} onClick={() => decide("APPROVE")} className={buttonClassName("primary")}>Approve change</button>
        <button type="button" disabled={isPending} onClick={() => decide("REQUEST_INFORMATION")} className={buttonClassName("secondary")}>Request information</button>
        <button type="button" disabled={isPending} onClick={() => decide("REJECT")} className={buttonClassName("danger")}>Reject request</button>
      </div>
      {error ? <p role="alert" className="mt-3 text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
