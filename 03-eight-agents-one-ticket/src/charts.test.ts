import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRun } from "./loader.js";
import { computeStats } from "./stats.js";
import { buildCharts } from "./charts.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(HERE, "..", "content", "data", "run-sample.json");
const stats = computeStats(parseRun(readFileSync(FIXTURE, "utf8")));
const charts = buildCharts(stats);

describe("charts", () => {
  it("generates charts", () => {
    expect(charts).toHaveLength(4);
  });
});
