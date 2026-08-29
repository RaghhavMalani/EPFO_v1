"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClassName } from "@/components/ui";
import type { Nominee } from "@/domain/schemas";

type NomineeRow = {
  key: string;
  name: string;
  relationship: string;
  sharePercentage: string;
  dateOfBirth: string;
};

let rowSequence = 0;
function newRow(source?: Nominee): NomineeRow {
  rowSequence += 1;
  return {
    key: `row-${rowSequence}`,
    name: source?.name ?? "",
    relationship: source?.relationship ?? "",
    sharePercentage: source ? String(source.sharePercentage) : "",
    dateOfBirth: source?.dateOfBirth ?? "",
  };
}

export function NominationForm({ existing }: { existing: Nominee[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<NomineeRow[]>(() => (existing.length > 0 ? existing.map((n) => newRow(n)) : [newRow()]));
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const total = rows.reduce((sum, row) => sum + (Number(row.sharePercentage) || 0), 0);

  function updateRow(key: string, patch: Partial<NomineeRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((current) => [...current, newRow()]);
  }

  function removeRow(key: string) {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : current));
  }

  async function submit() {
    setError(null);
    setIsPending(true);
    try {
      const response = await fetch("/api/actions/nomination", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE",
          nominees: rows.map((row) => ({
            name: row.name.trim(),
            relationship: row.relationship.trim(),
            sharePercentage: Number(row.sharePercentage) || 0,
            dateOfBirth: row.dateOfBirth.trim() || null,
          })),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "The nomination could not be saved.");
        return;
      }
      router.refresh();
    } catch {
      setError("The nomination could not be saved.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="nomination-form">
      {rows.map((row, index) => (
        <div key={row.key} className="nomination-row">
          <div className="nomination-row__fields">
            <label>
              <span>Nominee name</span>
              <input value={row.name} onChange={(event) => updateRow(row.key, { name: event.target.value })} placeholder="Full name" />
            </label>
            <label>
              <span>Relationship</span>
              <input value={row.relationship} onChange={(event) => updateRow(row.key, { relationship: event.target.value })} placeholder="e.g. Spouse" />
            </label>
            <label>
              <span>Share (%)</span>
              <input
                type="number"
                min={1}
                max={100}
                value={row.sharePercentage}
                onChange={(event) => updateRow(row.key, { sharePercentage: event.target.value })}
              />
            </label>
            <label>
              <span>Date of birth (optional)</span>
              <input
                type="date"
                value={row.dateOfBirth}
                onChange={(event) => updateRow(row.key, { dateOfBirth: event.target.value })}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => removeRow(row.key)}
            disabled={rows.length === 1}
            className="nomination-row__remove"
            aria-label={`Remove nominee ${index + 1}`}
          >
            <TrashIcon size={16} aria-hidden="true" />
          </button>
        </div>
      ))}

      <button type="button" onClick={addRow} className={buttonClassName("secondary")}>
        <PlusIcon size={16} aria-hidden="true" />
        Add another nominee
      </button>

      <div className={total === 100 ? "nomination-total nomination-total--complete" : "nomination-total"}>
        Total share: <strong className="tabular">{total}%</strong>{total !== 100 ? " — must add up to 100%" : ""}
      </div>

      {error ? <p role="alert" className="mt-2 text-sm font-medium text-[var(--danger)]">{error}</p> : null}

      <button type="button" onClick={submit} disabled={isPending} className={`${buttonClassName("primary")} mt-4`}>
        {isPending ? "Saving…" : "Save nomination"}
      </button>
    </div>
  );
}
