import { describe, it, expect } from "vitest";
import { TokenMeter } from "./index.js";

describe("TokenMeter", () => {
  it("accumulates tokens", () => {
    const meter = new TokenMeter(100);
    meter.add(50);
    expect(meter.total).toBe(50);
  });
});
