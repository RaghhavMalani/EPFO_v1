export type NomineeInput = {
  name: string;
  relationship: string;
  sharePercentage: number;
  dateOfBirth: string | null;
};

export type NomineeValidation = {
  valid: boolean;
  totalPercentage: number;
  issue: string | null;
};

/**
 * Deterministic e-Nomination rule: at least one named nominee, each with a name and
 * relationship, and shares that add up to exactly 100%.
 */
export function validateNomineeShares(nominees: NomineeInput[]): NomineeValidation {
  const totalPercentage = nominees.reduce((sum, nominee) => sum + nominee.sharePercentage, 0);

  if (nominees.length === 0) {
    return { valid: false, totalPercentage, issue: "At least one nominee is required." };
  }
  if (nominees.some((nominee) => nominee.name.trim() === "" || nominee.relationship.trim() === "")) {
    return { valid: false, totalPercentage, issue: "Every nominee needs a name and relationship." };
  }
  if (totalPercentage !== 100) {
    return {
      valid: false,
      totalPercentage,
      issue: `Nominee shares must add up to 100%; they currently add up to ${totalPercentage}%.`,
    };
  }

  return { valid: true, totalPercentage, issue: null };
}
