import { describe, it, expect } from "vitest";
import { split, formatCurrency, runningBalance } from "./index.js";

describe("moneysplit SUT", () => {
  it("splits amounts correctly and maintains invariants", () => {
    const weights = [1, 1, 1];
    const result = split(100, weights, { rounding: "largest-remainder" });
    expect(result).toHaveLength(3);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
  });
});
