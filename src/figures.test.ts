import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRun } from "./loader.js";
import { computeStats } from "./stats.js";
import { buildFigures, resolveSource } from "./figures.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(HERE, "..", "content", "data", "run-sample.json");
const run = parseRun(readFileSync(FIXTURE, "utf8"));
const stats = computeStats(run);
const figures = buildFigures(run, stats);

describe("figures", () => {
  it("resolves the winner and obvious strategy identifiers", () => {
    expect(figures["winner.strategy"]?.formatted).toBe("type-safe");
    expect(figures["obvious.strategy"]?.formatted).toBe("minimal-diff");
    expect(figures["run.id"]?.formatted).toBe(run.runId);
  });

  it("formats the headline counts derived from the run", () => {
    expect(figures["agents.count"]?.formatted).toBe("8");
    expect(figures["lanes.count"]?.formatted).toBe("6");
    expect(figures["green.count"]?.formatted).toBe("5");
    expect(figures["excluded.count"]?.formatted).toBe("1");
    expect(figures["cohort.n"]?.formatted).toBe("n=1");
    expect(figures["winner.rankOrdinal"]?.formatted).toBe("1st");
    expect(figures["obvious.rankOrdinal"]?.formatted).toBe("3rd");
  });

  it("formats computed spreads and deltas exactly as the prose will read them", () => {
    // 96 / 12 = 8.0x.
    expect(figures["diff.spreadRatio"]?.formatted).toBe("8.0x");
    // 52640 / 18420 = 2.86 -> 2.9x.
    expect(figures["token.spreadRatio"]?.formatted).toBe("2.9x");
    // (3.4 - 4.2) / 4.2 * 100 = -19.0%.
    expect(figures["winner.benchDeltaPct"]?.formatted).toBe("-19.0%");
  });

  it("formats time-to-green figures as m:ss from the raw millisecond fields", () => {
    // 42310ms -> 0:42, 88740ms -> 1:28, 60920ms -> 1:00.
    expect(figures["timeToGreen.min"]?.formatted).toBe("0:42");
    expect(figures["timeToGreen.max"]?.formatted).toBe("1:28");
    expect(figures["winner.timeToGreen"]?.formatted).toBe("1:00");
    expect(figures["timeToGreen.minStrategy"]?.formatted).toBe("minimal-diff");
    expect(figures["timeToGreen.maxStrategy"]?.formatted).toBe("performance-first");
  });

  it("formats token and diff extremes with thousands separators", () => {
    expect(figures["token.min"]?.formatted).toBe("18,420");
    expect(figures["token.max"]?.formatted).toBe("52,640");
    expect(figures["diff.min"]?.formatted).toBe("12");
    expect(figures["diff.max"]?.formatted).toBe("96");
  });

  it("carries the winner and obvious rubric scores from the lane records", () => {
    expect(figures["winner.score"]?.formatted).toBe("0.86");
    expect(figures["obvious.score"]?.formatted).toBe("0.78");
    // The winner outscored the obvious pick.
    expect(Number(figures["winner.score"]?.value)).toBeGreaterThan(
      Number(figures["obvious.score"]?.value),
    );
  });

  it("mirrors the rubric weights straight from the run record", () => {
    expect(figures["rubric.tests"]?.formatted).toBe("0.40");
    expect(figures["rubric.diff"]?.formatted).toBe("0.20");
    expect(figures["rubric.complexity"]?.formatted).toBe("0.20");
    expect(figures["rubric.bench"]?.formatted).toBe("0.20");
  });

  it("keeps every figure traceable to a real source in the run record", () => {
    // No figure is invented: each declares a source that resolves against the run.
    for (const entry of Object.values(figures)) {
      expect(entry.source.length).toBeGreaterThan(0);
      expect(resolveSource(run, entry.source)).toBe(true);
    }
  });
});
