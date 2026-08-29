"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClassName } from "@/components/ui";
import type { EcrRow } from "@/domain/experience-v2";

async function postEcrAction(ecrId: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/employer/ecr/${ecrId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(result.error ?? "This mock action could not be completed.");
  }
}

export function EcrRowCorrectionForm({ ecrId, row }: { ecrId: string; row: EcrRow }) {
  const router = useRouter();
  const [employee, setEmployee] = useState(row.employee);
  const [uanMasked, setUanMasked] = useState(row.uanMasked);
  const [wageRupees, setWageRupees] = useState(row.wagePaise > 0 ? String(row.wagePaise / 100) : "");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDuplicate = row.issues.some((issue) => issue.code === "DUPLICATE_EMPLOYEE");

  async function run(correction: Record<string, unknown>) {
    setError(null);
    setIsPending(true);
    try {
      await postEcrAction(ecrId, { action: "CORRECT_ROW", rowId: row.id, correction });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "This correction could not be saved.");
    } finally {
      setIsPending(false);
    }
  }

  if (isDuplicate) {
    return (
      <div className="ecr-row-form">
        <p className="ecr-row-form__hint">This masked UAN already appears earlier in the file. Excluding it prevents a duplicate payment.</p>
        <button type="button" onClick={() => run({})} disabled={isPending} className={buttonClassName("danger")}>
          {isPending ? "Working…" : "Exclude duplicate row"}
        </button>
        {error ? <p role="alert" className="ecr-row-form__error">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="ecr-row-form">
      <div className="ecr-row-form__fields">
        <label>
          <span>Employee</span>
          <input value={employee} onChange={(event) => setEmployee(event.target.value)} />
        </label>
        <label>
          <span>Masked UAN</span>
          <input value={uanMasked} onChange={(event) => setUanMasked(event.target.value)} />
        </label>
        <label>
          <span>Wage basis (₹)</span>
          <input type="number" min={0} value={wageRupees} onChange={(event) => setWageRupees(event.target.value)} />
        </label>
      </div>
      {error ? <p role="alert" className="ecr-row-form__error">{error}</p> : null}
      <button
        type="button"
        disabled={isPending}
        onClick={() => run({
          employee,
          uanMasked,
          wagePaise: Math.round(Number(wageRupees) * 100) || 0,
        })}
        className={buttonClassName("secondary")}
      >
        {isPending ? "Saving…" : "Save correction"}
      </button>
    </div>
  );
}
