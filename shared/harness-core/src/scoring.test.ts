import { describe, it, expect } from "vitest";
import { scoreLane } from "./index.js";

describe("scoring", () => {
  it("scores cohort", () => {
    const c = [{ testPassRate: 1, diffLines: 10, complexity: 5, benchMedianMs: 1 }];
    const score = scoreLane(c[0], c);
    expect(score).toBe(1);
  });
});
