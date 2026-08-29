import type { ClaimState } from "@/domain/schemas";

/**
 * The guided walkthrough.
 *
 * Two minutes, six steps, two roles. The point is not to show every screen — it is
 * to show the same four-beat pattern resolve two completely unrelated problems:
 * a contribution that never arrived, and a claim that cannot yet be filed.
 *
 * Progress is derived from scenario state rather than tracked alongside it. A judge
 * who wanders off the script, does a step early, or reloads mid-way is never shown a
 * position the data contradicts, and there is no second copy of the truth to drift.
 */

export const TOUR_PHASES = ["DETECT", "RESOLVE", "VERIFY", "COMPLETE"] as const;
export type TourPhase = (typeof TOUR_PHASES)[number];

export const TOUR_PHASE_LABELS: Record<TourPhase, string> = {
  DETECT: "Detect",
  RESOLVE: "Resolve",
  VERIFY: "Verify",
  COMPLETE: "Complete",
};

export type TourRole = "member" | "employer";

/** The scenario facts the walkthrough reads. Deliberately narrow, so the tour cannot smuggle in extra behaviour. */
export type TourSignals = {
  readinessPassedCount: number;
  readinessTotalChecks: number;
  claimState: ClaimState;
  ecrPaid: boolean;
  marchEmployerContributionPaise: number;
  pfBalancePaise: number;
};

export type TourStep = {
  id: string;
  phase: TourPhase;
  role: TourRole;
  /** What this beat proves. */
  title: string;
  /** What the judge should do on the screen it opens. */
  instruction: string;
  href: string;
  /**
   * When present, scenario state alone decides this step is finished. Steps without
   * one are "look at this" beats that finish when the judge moves on.
   */
  isSatisfied?: (signals: TourSignals) => boolean;
};

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "DETECT_MISMATCH",
    phase: "DETECT",
    role: "member",
    title: "A contribution that never arrived",
    instruction:
      "Open March. Every month is checked against what your recorded wages should have produced, so the gap is found here — not months later in a grievance queue.",
    href: "/passbook",
  },
  {
    id: "RESOLVE_ECR",
    phase: "RESOLVE",
    role: "employer",
    title: "Routed to who can actually fix it",
    instruction:
      "Now you are the employer. The payroll return behind that month fails validation. Correct the failing rows, generate the challan, and pay.",
    href: "/employer/ecr",
    isSatisfied: (signals) => signals.ecrPaid,
  },
  {
    id: "VERIFY_PASSBOOK",
    phase: "VERIFY",
    role: "member",
    title: "The money moves",
    instruction:
      "Back as the member. That single payment posted the contribution and moved the PF balance. One event, both sides of the system.",
    href: "/passbook",
  },
  {
    id: "DETECT_BLOCKERS",
    phase: "DETECT",
    role: "member",
    title: "The same pattern, a different problem",
    instruction:
      "You have left your job and want your PF. Run the readiness checks: two of the seven block the claim, and each names who owns it.",
    href: "/withdraw",
  },
  {
    id: "RESOLVE_BLOCKERS",
    phase: "RESOLVE",
    role: "member",
    title: "5 of 7, then 6, then 7",
    instruction:
      "Record your Date of Exit yourself. The legacy record cannot be self-approved, so it goes to the employer — and readiness moves as each one clears.",
    href: "/withdraw/preflight",
    isSatisfied: (signals) => signals.readinessPassedCount >= signals.readinessTotalChecks,
  },
  {
    id: "COMPLETE_CLAIM",
    phase: "COMPLETE",
    role: "member",
    title: "A claim that cannot fail",
    instruction:
      "Every blocker was found and cleared before submission. Submit, and follow it through processing to the credit.",
    href: "/withdraw/review",
    isSatisfied: (signals) => signals.claimState === "CREDITED",
  },
];

export type TourStepStatus = "DONE" | "CURRENT" | "UPCOMING";

/**
 * A step as the UI sees it: plain data, with the completion predicate dropped.
 *
 * The rail is a Client Component, so anything handed to it has to survive
 * serialisation — and `isSatisfied` is an implementation detail of the derivation,
 * not something a renderer should be able to re-run against different signals.
 */
export type ResolvedTourStep = Omit<TourStep, "isSatisfied"> & {
  status: TourStepStatus;
  index: number;
};

export type TourProgress = {
  steps: ResolvedTourStep[];
  currentStep: ResolvedTourStep;
  currentIndex: number;
  phase: TourPhase;
  isComplete: boolean;
};

/**
 * Where the walkthrough actually is.
 *
 * `acknowledgedIndex` is how far the judge has clicked; scenario state can only push
 * that forward, never back. So finishing a step early jumps the tour to match, and
 * nothing the judge does can make the rail claim less progress than the data shows.
 */
export function deriveTourProgress(signals: TourSignals, acknowledgedIndex: number): TourProgress {
  const satisfied = TOUR_STEPS.map((step) => step.isSatisfied?.(signals) ?? false);
  const lastSatisfied = satisfied.lastIndexOf(true);

  const clampedAcknowledged = Math.min(Math.max(acknowledgedIndex, 0), TOUR_STEPS.length - 1);
  const currentIndex = Math.min(
    TOUR_STEPS.length - 1,
    Math.max(clampedAcknowledged, lastSatisfied + 1),
  );

  const isComplete = satisfied[TOUR_STEPS.length - 1];

  const steps: ResolvedTourStep[] = TOUR_STEPS.map((step, index) => ({
    id: step.id,
    phase: step.phase,
    role: step.role,
    title: step.title,
    instruction: step.instruction,
    href: step.href,
    index,
    status: isComplete || index < currentIndex ? "DONE" : index === currentIndex ? "CURRENT" : "UPCOMING",
  }));

  return {
    steps,
    currentStep: steps[currentIndex],
    currentIndex,
    phase: steps[currentIndex].phase,
    isComplete,
  };
}
