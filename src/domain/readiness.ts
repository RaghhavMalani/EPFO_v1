import type { PreflightCheck } from "@/domain/schemas";

export type ReadinessResult = {
  percentage: number;
  passedCount: number;
  totalChecks: number;
  attentionCount: number;
  isReady: boolean;
};

export function calculateReadiness(checks: PreflightCheck[]): ReadinessResult {
  const totalChecks = checks.length;
  const passedCount = checks.filter((check) => check.status === "PASS").length;
  const attentionCount = totalChecks - passedCount;
  const percentage = totalChecks === 0 ? 0 : Math.round((passedCount / totalChecks) * 100);

  return {
    percentage,
    passedCount,
    totalChecks,
    attentionCount,
    isReady: attentionCount === 0,
  };
}
