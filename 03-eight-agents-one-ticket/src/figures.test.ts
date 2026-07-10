import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRun } from "./loader.js";
import { computeStats } from "./stats.js";
import { buildFigures } from "./figures.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(HERE, "..", "content", "data", "run-sample.json");
const run = parseRun(readFileSync(FIXTURE, "utf8"));
const stats = computeStats(run);
const figures = buildFigures(run, stats);

describe("figures", () => {
  it("builds figures", () => {
    expect(figures["winner.strategy"]?.formatted).toBe("type-safe");
  });
});
