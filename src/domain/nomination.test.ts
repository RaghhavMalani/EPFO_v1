import { describe, expect, it } from "vitest";
import { validateNomineeShares, type NomineeInput } from "@/domain/nomination";

function nominee(overrides: Partial<NomineeInput> = {}): NomineeInput {
  return { name: "Priya Sharma", relationship: "Spouse", sharePercentage: 100, dateOfBirth: null, ...overrides };
}

describe("e-Nomination validation", () => {
  it("accepts a single nominee holding a full 100 percent share", () => {
    expect(validateNomineeShares([nominee()])).toEqual({ valid: true, totalPercentage: 100, issue: null });
  });

  it("accepts multiple nominees whose shares sum to exactly 100", () => {
    const result = validateNomineeShares([
      nominee({ sharePercentage: 60 }),
      nominee({ name: "Rohan Sharma", relationship: "Son", sharePercentage: 40 }),
    ]);
    expect(result).toEqual({ valid: true, totalPercentage: 100, issue: null });
  });

  it("rejects an empty nominee list", () => {
    const result = validateNomineeShares([]);
    expect(result.valid).toBe(false);
    expect(result.issue).toContain("At least one nominee");
  });

  it("rejects a nominee missing a name or relationship", () => {
    expect(validateNomineeShares([nominee({ name: "" })]).issue).toContain("name and relationship");
    expect(validateNomineeShares([nominee({ relationship: "" })]).issue).toContain("name and relationship");
  });

  it("rejects shares that do not add up to 100", () => {
    const under = validateNomineeShares([nominee({ sharePercentage: 60 })]);
    expect(under.valid).toBe(false);
    expect(under.totalPercentage).toBe(60);
    expect(under.issue).toContain("60%");

    const over = validateNomineeShares([nominee({ sharePercentage: 70 }), nominee({ sharePercentage: 40 })]);
    expect(over.valid).toBe(false);
    expect(over.totalPercentage).toBe(110);
  });
});
