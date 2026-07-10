// Shared record and rubric types produced by the tournament harness.
// Only the type surface consumed by the blog is inlined here.

export interface RubricWeights {
  tests: number;
  diff: number;
  complexity: number;
  benchmark: number;
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
