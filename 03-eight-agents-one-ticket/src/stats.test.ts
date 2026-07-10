import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRun } from "./loader.js";
import { computeStats } from "./stats.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(HERE, "..", "content", "data", "run-sample.json");
const run = parseRun(readFileSync(FIXTURE, "utf8"));

describe("stats", () => {
  it("computes stats", () => {
    const s = computeStats(run);
    expect(s.winner).toBe("type-safe");
  });
});
