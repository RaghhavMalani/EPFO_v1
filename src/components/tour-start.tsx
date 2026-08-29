"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TourStartCard() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function startTour() {
    setIsPending(true);
    const response = await fetch("/api/tour", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "START" }),
    });
    const result = (await response.json()) as { redirectTo?: string };
    router.push(result.redirectTo ?? "/passbook");
    router.refresh();
  }

  return (
    <section className="tour-start" aria-labelledby="tour-start-title">
      <div>
        <p className="tour-start__eyebrow">Two minutes, two roles</p>
        <h2 id="tour-start-title">Experience EPFO One</h2>
        <p className="tour-start__copy">
          A guided walkthrough of one contribution that never arrived and one claim that could not
          be filed — and how both get found, routed, and closed. It signs you in and switches roles
          for you.
        </p>
      </div>
      <button type="button" onClick={startTour} disabled={isPending} className="tour-start__button">
        {isPending ? "Starting…" : "Start the walkthrough"}
        {!isPending ? <ArrowRightIcon size={18} weight="bold" aria-hidden="true" /> : null}
      </button>
    </section>
  );
}
