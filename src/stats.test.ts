import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRun } from "./loader.js";
import { computeStats, OBVIOUS_STRATEGY } from "./stats.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(HERE, "..", "content", "data", "run-sample.json");
const run = parseRun(readFileSync(FIXTURE, "utf8"));
const stats = computeStats(run);

describe("stats", () => {
  it("names the winner and the obvious strategy from the run", () => {
    expect(stats.winner).toBe("type-safe");
    expect(stats.obviousStrategy).toBe(OBVIOUS_STRATEGY);
    expect(stats.obviousStrategy).toBe("minimal-diff");
  });

  it("ranks the green lanes by score descending (headline finding)", () => {
    // Only the five green lanes are ranked; the red lane is excluded, not ranked.
    expect(stats.ranking.map((r) => r.strategy)).toEqual([
      "type-safe",
      "zero-dependency",
      "minimal-diff",
      "performance-first",
      "most-readable",
    ]);
    // Ranks are 1..n and monotonically non-increasing in score.
    expect(stats.ranking.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5]);
    for (let i = 1; i < stats.ranking.length; i++) {
      expect(stats.ranking[i]!.score).toBeLessThanOrEqual(stats.ranking[i - 1]!.score);
    }
  });

  it("places the obvious minimal-diff pick BELOW the winner (the article's point)", () => {
    expect(stats.winnerRank).toBe(1);
    expect(stats.obviousRank).toBe(3);
    // The whole thesis: the intuitive pick did not win.
    expect(stats.obviousRank).toBeGreaterThan(stats.winnerRank);
    expect(stats.winner).not.toBe(stats.obviousStrategy);
  });

  it("counts agents, lanes, and cohort correctly", () => {
    // agentCount = lanes + controller + judge = 6 + 2 = 8 ("Eight Agents").
    expect(stats.agentCount).toBe(8);
    expect(stats.laneCount).toBe(6);
    expect(stats.greenCount).toBe(5);
    expect(stats.excludedCount).toBe(1);
    expect(stats.greenCount + stats.excludedCount).toBe(stats.laneCount);
    expect(stats.cohortN).toBe(1);
    expect(stats.smallSample).toBe(true);
  });

  it("derives diff extremes and spread ratio from the data (spot-check)", () => {
    expect(stats.diffMin.strategy).toBe("minimal-diff");
    expect(stats.diffMin.value).toBe(12);
    expect(stats.diffMax.strategy).toBe("most-defensive");
    expect(stats.diffMax.value).toBe(96);
    // 96 / 12 = 8.0 exactly.
    expect(stats.diffSpreadRatio).toBe(8);
    expect(stats.diffSpreadRatio).toBe(stats.diffMax.value / stats.diffMin.value);
  });

  it("derives token extremes and spread ratio from the data (spot-check)", () => {
    expect(stats.tokenMin.strategy).toBe("minimal-diff");
    expect(stats.tokenMin.value).toBe(18420);
    expect(stats.tokenMax.strategy).toBe("most-defensive");
    expect(stats.tokenMax.value).toBe(52640);
    expect(stats.tokenSpreadRatio).toBeCloseTo(52640 / 18420, 10);
    expect(stats.tokenSpreadRatio).toBeCloseTo(2.8578, 3);
  });

  it("computes the winner-vs-obvious benchmark delta from the data (spot-check)", () => {
    expect(stats.winnerBenchMs).toBe(3.4);
    expect(stats.obviousBenchMs).toBe(4.2);
    // (3.4 - 4.2) / 4.2 * 100 = -19.05%.
    expect(stats.winnerBenchDeltaPct).toBeCloseTo(((3.4 - 4.2) / 4.2) * 100, 10);
    expect(stats.winnerBenchDeltaPct).toBeCloseTo(-19.0476, 3);
    // The winner is genuinely faster than the obvious pick.
    expect(stats.winnerBenchDeltaPct).toBeLessThan(0);
  });

  it("orders time-to-green ascending and identifies min/max/winner", () => {
    const values = stats.timeToGreen.map((m) => m.value);
    expect([...values]).toEqual([...values].sort((a, b) => a - b));
    expect(stats.timeToGreenMin.strategy).toBe("minimal-diff");
    expect(stats.timeToGreenMin.value).toBe(42310);
    expect(stats.timeToGreenMax.strategy).toBe("performance-first");
    expect(stats.timeToGreenMax.value).toBe(88740);
    // First green is not best: the winner went green later than the fastest lane.
    expect(stats.winnerTimeMs).toBe(60920);
    expect(stats.winnerTimeMs).toBeGreaterThan(stats.timeToGreenMin.value);
    // The excluded red lane never greened and is kept out of the green series.
    expect(stats.didNotGreen.map((m) => m.strategy)).toEqual(["most-defensive"]);
    expect(stats.timeToGreen.some((m) => m.strategy === "most-defensive")).toBe(false);
  });
});
