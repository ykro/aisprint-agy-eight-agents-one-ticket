import type { LaneMetrics } from "./metrics.js";

export interface RubricWeights {
  tests: number;
  diff: number;
  complexity: number;
  benchmark: number;
}

export const DEFAULT_WEIGHTS: RubricWeights = {
  tests: 0.4,
  diff: 0.2,
  complexity: 0.2,
  benchmark: 0.2,
};

function normHigher(value: number, all: number[]): number {
  const min = Math.min(...all);
  const max = Math.max(...all);
  if (max === min) return 1;
  return clamp01((value - min) / (max - min));
}

function normLower(value: number, all: number[]): number {
  const min = Math.min(...all);
  const max = Math.max(...all);
  if (max === min) return 1;
  return clamp01((max - value) / (max - min));
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function scoreLane(
  m: LaneMetrics,
  cohort: LaneMetrics[],
  weights: RubricWeights = DEFAULT_WEIGHTS,
): number {
  if (cohort.length === 0) {
    throw new RangeError("cohort must not be empty");
  }
  const tests = cohort.map((c) => c.testPassRate);
  const diffs = cohort.map((c) => c.diffLines);
  const complexities = cohort.map((c) => c.complexity);
  const benches = cohort.map((c) => c.benchMedianMs);

  return (
    weights.tests * normHigher(m.testPassRate, tests) +
    weights.diff * normLower(m.diffLines, diffs) +
    weights.complexity * normLower(m.complexity, complexities) +
    weights.benchmark * normLower(m.benchMedianMs, benches)
  );
}

export interface LaneRecord {
  strategy: string;
  passRate: number;
  diffLines: number;
  complexity: number;
  benchMedianMs: number;
  tokenCost: number;
  timeToFirstGreenMs: number;
  score: number;
  status: "green" | "red";
}

export interface RunRecord {
  runId: string;
  spec: string;
  createdAt: string;
  lanes: LaneRecord[];
  winner: string;
  weights: RubricWeights;
}
