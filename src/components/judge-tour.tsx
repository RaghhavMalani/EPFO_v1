"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CaretDownIcon,
  CheckIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  TOUR_PHASES,
  TOUR_PHASE_LABELS,
  type TourProgress,
} from "@/domain/judge-tour";
import type { TraceEntry } from "@/domain/system-trace";

const ACTOR_LABELS: Record<TraceEntry["actorType"], string> = {
  CITIZEN: "Member",
  EMPLOYER: "Employer",
  SYSTEM: "System",
  PROCESSOR: "EPFO",
  BANK: "Bank",
};

function timeOf(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function JudgeTourRail({
  progress,
  trace,
}: {
  progress: TourProgress;
  trace: TraceEntry[];
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isTraceOpen, setIsTraceOpen] = useState(false);
  const { currentStep, currentIndex, steps, isComplete } = progress;

  async function send(body: Record<string, unknown>) {
    setIsPending(true);
    try {
      const response = await fetch("/api/tour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as { redirectTo?: string };
      if (result.redirectTo) {
        router.push(result.redirectTo);
      }
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  // Newest first, so the most recent thing the judge caused is the line they read.
  const recentTrace = [...trace].reverse().slice(0, isTraceOpen ? 40 : 4);

  return (
    <aside className="tour-rail" aria-label="Guided walkthrough">
      <div className="tour-rail__phases" aria-hidden="true">
        {TOUR_PHASES.map((phase, index) => (
          <span
            key={phase}
            className={`tour-phase${phase === progress.phase ? " tour-phase--current" : ""}`}
          >
            <em>{String(index + 1).padStart(2, "0")}</em>
            {TOUR_PHASE_LABELS[phase]}
          </span>
        ))}
      </div>

      <div className="tour-rail__body">
        <p className="tour-rail__counter">
          <span className="tour-rail__badge">{currentStep.role === "employer" ? "Employer" : "Member"}</span>
          Step {currentIndex + 1} of {steps.length}
        </p>
        <h2 className="tour-rail__title">{isComplete ? "That is the whole pattern" : currentStep.title}</h2>
        <p className="tour-rail__instruction">
          {isComplete
            ? "Detect, resolve, verify, complete — run twice, on two unrelated problems, across two roles. Every step above is still open to revisit."
            : currentStep.instruction}
        </p>

        <div className="tour-rail__actions">
          <button
            type="button"
            className="tour-button tour-button--ghost"
            disabled={isPending || currentIndex === 0}
            onClick={() => send({ action: "GO", index: currentIndex - 1 })}
          >
            <ArrowLeftIcon size={15} weight="bold" aria-hidden="true" />
            Back
          </button>
          <button
            type="button"
            className="tour-button tour-button--primary"
            disabled={isPending || currentIndex === steps.length - 1}
            onClick={() => send({ action: "GO", index: currentIndex + 1 })}
          >
            {currentIndex === steps.length - 1 ? "Last step" : "Next step"}
            <ArrowRightIcon size={15} weight="bold" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="tour-button tour-button--ghost tour-rail__exit"
            disabled={isPending}
            onClick={() => send({ action: "EXIT" })}
          >
            <XIcon size={14} weight="bold" aria-hidden="true" />
            Exit tour
          </button>
        </div>

        <ol className="tour-steps">
          {steps.map((step) => (
            <li key={step.id} className={`tour-step tour-step--${step.status.toLowerCase()}`}>
              <button
                type="button"
                disabled={isPending}
                onClick={() => send({ action: "GO", index: step.index })}
              >
                <span className="tour-step__marker" aria-hidden="true">
                  {step.status === "DONE" ? <CheckIcon size={11} weight="bold" /> : step.index + 1}
                </span>
                <span className="tour-step__label">{step.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="tour-trace">
        <button
          type="button"
          className="tour-trace__toggle"
          aria-expanded={isTraceOpen}
          onClick={() => setIsTraceOpen((open) => !open)}
        >
          <span className="tour-trace__pulse" aria-hidden="true" />
          Live resolution trace
          <em>{trace.length}</em>
          <CaretDownIcon
            size={13}
            weight="bold"
            aria-hidden="true"
            className={isTraceOpen ? "tour-trace__caret tour-trace__caret--open" : "tour-trace__caret"}
          />
        </button>

        {trace.length === 0 ? (
          <p className="tour-trace__empty">Nothing has happened on this account yet.</p>
        ) : (
          <ol className={isTraceOpen ? "tour-trace__list tour-trace__list--open" : "tour-trace__list"}>
            {recentTrace.map((entry) => (
              <li
                key={entry.id}
                className={entry.isCrossRole ? "trace-line trace-line--cross" : "trace-line"}
              >
                <time dateTime={entry.timestamp} className="tabular">{timeOf(entry.timestamp)}</time>
                <span className="trace-line__actor">{ACTOR_LABELS[entry.actorType]}</span>
                <span className="trace-line__label">{entry.label}</span>
                {entry.consequence ? (
                  <span className="trace-line__consequence tabular">{entry.consequence}</span>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}
