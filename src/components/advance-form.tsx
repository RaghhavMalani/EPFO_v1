"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClassName } from "@/components/ui";
import type { AdvanceApplication, AdvanceGoal } from "@/domain/experience-v2";

const GOALS: { value: AdvanceGoal; label: string; detail: string }[] = [
  { value: "MEDICAL", label: "Medical treatment", detail: "No minimum service period" },
  { value: "MARRIAGE", label: "Marriage", detail: "7 years of completed service" },
  { value: "EDUCATION", label: "Education", detail: "7 years of completed service" },
  { value: "HOUSING", label: "Housing", detail: "5 years of completed service" },
];

export const GOAL_LABELS: Record<AdvanceGoal, string> = {
  MEDICAL: "Medical treatment",
  MARRIAGE: "Marriage",
  EDUCATION: "Education",
  HOUSING: "Housing",
};

async function postAdvance(body: Record<string, unknown>) {
  const response = await fetch("/api/actions/advance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(result.error ?? "This mock action could not be completed.");
  }
}

export function GoalPicker({ goal }: { goal: AdvanceGoal }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState<AdvanceGoal | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function selectGoal(next: AdvanceGoal) {
    setError(null);
    setIsPending(next);
    try {
      await postAdvance({ action: "SELECT_GOAL", goal: next });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "This mock action could not be completed.");
    } finally {
      setIsPending(null);
    }
  }

  return (
    <div>
      <div className="goal-grid" role="radiogroup" aria-label="Advance purpose">
        {GOALS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={goal === option.value}
            onClick={() => selectGoal(option.value)}
            disabled={isPending !== null}
            className={goal === option.value ? "goal-card goal-card--selected" : "goal-card"}
          >
            <strong>{option.label}</strong>
            <small>{isPending === option.value ? "Recalculating…" : option.detail}</small>
          </button>
        ))}
      </div>
      {error ? <p role="alert" className="mt-2 text-sm font-medium text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}

export function AdvanceSubmitForm({ advance }: { advance: AdvanceApplication }) {
  const router = useRouter();
  const [rupees, setRupees] = useState(String(Math.round(advance.maximumEligibleAmountPaise / 100)));
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const paise = Math.round(Number(rupees) * 100);
    if (!Number.isFinite(paise) || paise <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setIsPending(true);
    try {
      await postAdvance({ action: "SUBMIT", requestedAmountPaise: paise });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "This mock action could not be completed.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="advance-submit-form">
      <label className="login-card__field">
        <span>Requested amount (₹)</span>
        <input
          type="number"
          min={1}
          max={Math.round(advance.maximumEligibleAmountPaise / 100)}
          value={rupees}
          onChange={(event) => setRupees(event.target.value)}
        />
      </label>
      {error ? <p role="alert" className="mt-2 text-sm font-medium text-[var(--danger)]">{error}</p> : null}
      <button type="button" onClick={submit} disabled={isPending} className={`${buttonClassName("primary")} mt-4`}>
        {isPending ? "Submitting…" : "Submit advance request"}
        {!isPending ? <ArrowRightIcon size={18} aria-hidden="true" /> : null}
      </button>
    </div>
  );
}

export function SimulateProcessingButton({ label }: { label: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function advance() {
    setError(null);
    setIsPending(true);
    try {
      await postAdvance({ action: "ADVANCE" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "This mock action could not be completed.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={advance} disabled={isPending} className={buttonClassName("secondary")}>
        {isPending ? "Working…" : label}
      </button>
      {error ? <p role="alert" className="mt-2 text-sm font-medium text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
