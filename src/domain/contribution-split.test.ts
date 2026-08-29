import { describe, expect, it } from "vitest";
import { splitContribution } from "@/domain/contribution-split";

describe("contribution split explainer", () => {
  it("decomposes a wage basis into the statutory 12 / 3.67 / 8.33 percent shares", () => {
    const split = splitContribution(1_800_000);
    expect(split).toMatchObject({
      wageBasisPaise: 1_800_000,
      employeePfPaise: 216_000,
      employerPfPaise: 66_060,
      employerEpsPaise: 149_940,
      employeePfSharePercent: 12,
      employerPfSharePercent: 3.67,
      employerEpsSharePercent: 8.33,
    });
    expect(split.totalPaise).toBe(432_000);
  });

  it("expresses each share as a proportion of the combined 24 percent total", () => {
    const split = splitContribution(1_800_000);
    const sum = split.employeePfShareOfTotalPercent + split.employerPfShareOfTotalPercent + split.employerEpsShareOfTotalPercent;
    expect(sum).toBeCloseTo(100, 6);
    expect(split.employeePfShareOfTotalPercent).toBeCloseTo(50, 6);
  });

  it("is deterministic and rounds each share independently", () => {
    const a = splitContribution(2_137_000);
    const b = splitContribution(2_137_000);
    expect(a).toEqual(b);
    expect(Number.isInteger(a.employeePfPaise)).toBe(true);
    expect(Number.isInteger(a.employerPfPaise)).toBe(true);
    expect(Number.isInteger(a.employerEpsPaise)).toBe(true);
  });

  it("returns zero shares for a zero wage basis", () => {
    expect(splitContribution(0)).toMatchObject({
      employeePfPaise: 0,
      employerPfPaise: 0,
      employerEpsPaise: 0,
      totalPaise: 0,
    });
  });
});
