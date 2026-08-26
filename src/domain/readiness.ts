import type { PreflightCheck, PreflightCheckId } from "@/domain/schemas";

export const READINESS_WEIGHTS: Record<PreflightCheckId, number> = {
  IDENTITY_VERIFIED: 14,
  PAN_VERIFIED: 14,
  BANK_VERIFIED: 14,
  WITHDRAWAL_ELIGIBILITY: 14,
  PREVIOUS_EMPLOYMENT_EXIT_RECORDED: 14,
  OLD_BALANCE_TRANSFERRED: 14,
  REQUIRED_INFORMATION_COMPLETE: 16,
};

export type ReadinessResult = {
  percentage: number;
  passedWeight: number;
  totalWeight: number;
  attentionCount: number;
  isReady: boolean;
};

export function calculateReadiness(checks: PreflightCheck[]): ReadinessResult {
  const totalWeight = checks.reduce((sum, check) => sum + READINESS_WEIGHTS[check.id], 0);
  const passedWeight = checks.reduce(
    (sum, check) => sum + (check.status === "PASS" ? READINESS_WEIGHTS[check.id] : 0),
    0,
  );
  const percentage = totalWeight === 0 ? 0 : Math.round((passedWeight / totalWeight) * 100);
  const attentionCount = checks.filter((check) => check.status !== "PASS").length;

  return {
    percentage,
    passedWeight,
    totalWeight,
    attentionCount,
    isReady: attentionCount === 0,
  };
}
