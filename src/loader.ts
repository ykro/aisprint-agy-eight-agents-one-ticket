import { readFileSync } from "node:fs";
import type { LaneRecord, RunRecord, RubricWeights } from "./harness.js";

const STRATEGIES = [
  "minimal-diff",
  "performance-first",
  "type-safe",
  "zero-dependency",
  "most-readable",
  "most-defensive",
] as const;

function fail(message: string): never {
  throw new Error(`invalid run record: ${message}`);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function validateWeights(w: unknown): RubricWeights {
  if (typeof w !== "object" || w === null) fail("weights must be an object");
  const obj = w as Record<string, unknown>;
  for (const key of ["tests", "diff", "complexity", "benchmark"] as const) {
    if (!isFiniteNumber(obj[key])) fail(`weights.${key} must be a number`);
  }
  return {
    tests: obj.tests as number,
    diff: obj.diff as number,
    complexity: obj.complexity as number,
    benchmark: obj.benchmark as number,
  };
}

function validateLane(l: unknown, index: number): LaneRecord {
  if (typeof l !== "object" || l === null) fail(`lanes[${index}] must be an object`);
  const obj = l as Record<string, unknown>;
  const at = (field: string) => `lanes[${index}].${field}`;

  if (typeof obj.strategy !== "string") fail(`${at("strategy")} must be a string`);
  if (!STRATEGIES.includes(obj.strategy as any)) {
    fail(`${at("strategy")} "${obj.strategy}" is not a known strategy`);
  }
  if (obj.status !== "green" && obj.status !== "red") {
    fail(`${at("status")} must be "green" or "red"`);
  }
  for (const field of [
    "passRate",
    "diffLines",
    "complexity",
    "benchMedianMs",
    "tokenCost",
    "timeToFirstGreenMs",
    "score",
  ] as const) {
    if (!isFiniteNumber(obj[field])) fail(`${at(field)} must be a number`);
  }

  return {
    strategy: obj.strategy as string,
    passRate: obj.passRate as number,
    diffLines: obj.diffLines as number,
    complexity: obj.complexity as number,
    benchMedianMs: obj.benchMedianMs as number,
    tokenCost: obj.tokenCost as number,
    timeToFirstGreenMs: obj.timeToFirstGreenMs as number,
    score: obj.score as number,
    status: obj.status as "green" | "red",
  };
}

export function parseRun(json: string): RunRecord {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (err) {
    fail(`not valid JSON (${err instanceof Error ? err.message : String(err)})`);
  }
  if (typeof raw !== "object" || raw === null) fail("root must be an object");
  const obj = raw as Record<string, unknown>;

  if (typeof obj.runId !== "string") fail("runId must be a string");
  if (typeof obj.spec !== "string") fail("spec must be a string");
  if (typeof obj.createdAt !== "string") fail("createdAt must be a string");
  if (typeof obj.winner !== "string") fail("winner must be a string");
  if (!Array.isArray(obj.lanes) || obj.lanes.length === 0) {
    fail("lanes must be a non-empty array");
  }

  const weights = validateWeights(obj.weights);
  const lanes = obj.lanes.map((l, i) => validateLane(l, i));

  if (!lanes.some((l) => l.strategy === obj.winner)) {
    fail(`winner "${obj.winner}" does not match any lane strategy`);
  }

  return {
    runId: obj.runId as string,
    spec: obj.spec as string,
    createdAt: obj.createdAt as string,
    winner: obj.winner as string,
    weights,
    lanes,
  };
}

export function loadRun(path: string): RunRecord {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (err) {
    throw new Error(
      `could not read run file at ${path}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  return parseRun(text);
}
