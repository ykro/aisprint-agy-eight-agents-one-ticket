import type { LaneRecord, RunRecord } from "@aisprint/harness-core";

export const OBVIOUS_STRATEGY = "minimal-diff";

export function agentCount(run: RunRecord): number {
  return run.lanes.length + 2;
}

export interface RankEntry {
  strategy: string;
  score: number;
  diffLines: number;
  rank: number;
  laneIndex: number;
}

export interface Magnitude {
  strategy: string;
  value: number;
  status: "green" | "red";
  laneIndex: number;
}

export interface Stats {
  runId: string;
  spec: string;
  createdAt: string;
  winner: string;
  obviousStrategy: string;
  agentCount: number;
  laneCount: number;
  greenCount: number;
  excludedCount: number;
  cohortN: number;
  smallSample: boolean;
  ranking: RankEntry[];
  obviousRank: number;
  winnerRank: number;
  timeToGreen: Magnitude[];
  timeToGreenMin: Magnitude;
  timeToGreenMax: Magnitude;
  winnerTimeMs: number;
  didNotGreen: Magnitude[];
  diff: Magnitude[];
  diffMin: Magnitude;
  diffMax: Magnitude;
  diffSpreadRatio: number;
  token: Magnitude[];
  tokenMin: Magnitude;
  tokenMax: Magnitude;
  tokenSpreadRatio: number;
  winnerScore: number;
  obviousScore: number;
  winnerBenchMs: number;
  obviousBenchMs: number;
  winnerBenchDeltaPct: number;
}

function laneIndexOf(run: RunRecord, strategy: string): number {
  const idx = run.lanes.findIndex((l) => l.strategy === strategy);
  if (idx === -1) throw new Error(`no lane for strategy "${strategy}"`);
  return idx;
}

function laneOf(run: RunRecord, strategy: string): LaneRecord {
  return run.lanes[laneIndexOf(run, strategy)]!;
}

export function computeStats(run: RunRecord): Stats {
  const green = run.lanes.filter((l) => l.status === "green");
  const red = run.lanes.filter((l) => l.status !== "green");

  const colorOrdered = [...green].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.diffLines - b.diffLines;
  });

  const ranking: RankEntry[] = colorOrdered.map((l, i) => ({
    strategy: l.strategy,
    score: l.score,
    diffLines: l.diffLines,
    rank: i + 1,
    laneIndex: laneIndexOf(run, l.strategy),
  }));

  const rankOf = (strategy: string): number => {
    const entry = ranking.find((r) => r.strategy === strategy);
    if (!entry) throw new Error(`strategy "${strategy}" is not ranked`);
    return entry.rank;
  };

  const timeToGreen: Magnitude[] = green
    .map((l) => ({
      strategy: l.strategy,
      value: l.timeToFirstGreenMs,
      status: l.status,
      laneIndex: laneIndexOf(run, l.strategy),
    }))
    .sort((a, b) => a.value - b.value || a.strategy.localeCompare(b.strategy));

  const didNotGreen: Magnitude[] = red
    .map((l) => ({
      strategy: l.strategy,
      value: l.timeToFirstGreenMs,
      status: l.status,
      laneIndex: laneIndexOf(run, l.strategy),
    }))
    .sort((a, b) => a.strategy.localeCompare(b.strategy));

  const magByField = (field: "diffLines" | "tokenCost"): Magnitude[] =>
    run.lanes
      .map((l) => ({
        strategy: l.strategy,
        value: l[field],
        status: l.status,
        laneIndex: laneIndexOf(run, l.strategy),
      }))
      .sort((a, b) => a.value - b.value || a.strategy.localeCompare(b.strategy));

  const diff = magByField("diffLines");
  const token = magByField("tokenCost");

  const winnerLane = laneOf(run, run.winner);
  const obviousLane = laneOf(run, OBVIOUS_STRATEGY);

  const first = <T>(arr: T[]): T => {
    if (arr.length === 0) throw new Error("empty series");
    return arr[0]!;
  };
  const last = <T>(arr: T[]): T => {
    if (arr.length === 0) throw new Error("empty series");
    return arr[arr.length - 1]!;
  };

  const diffMin = first(diff);
  const diffMax = last(diff);
  const tokenMin = first(token);
  const tokenMax = last(token);
  const timeMin = first(timeToGreen);
  const timeMax = last(timeToGreen);

  return {
    runId: run.runId,
    spec: run.spec,
    createdAt: run.createdAt,
    winner: run.winner,
    obviousStrategy: OBVIOUS_STRATEGY,
    agentCount: agentCount(run),
    laneCount: run.lanes.length,
    greenCount: green.length,
    excludedCount: red.length,
    cohortN: 1,
    smallSample: true,
    ranking,
    obviousRank: rankOf(OBVIOUS_STRATEGY),
    winnerRank: rankOf(run.winner),
    timeToGreen,
    timeToGreenMin: timeMin,
    timeToGreenMax: timeMax,
    winnerTimeMs: winnerLane.timeToFirstGreenMs,
    didNotGreen,
    diff,
    diffMin,
    diffMax,
    diffSpreadRatio: diffMax.value / diffMin.value,
    token,
    tokenMin,
    tokenMax,
    tokenSpreadRatio: tokenMax.value / tokenMin.value,
    winnerScore: winnerLane.score,
    obviousScore: obviousLane.score,
    winnerBenchMs: winnerLane.benchMedianMs,
    obviousBenchMs: obviousLane.benchMedianMs,
    winnerBenchDeltaPct:
      ((winnerLane.benchMedianMs - obviousLane.benchMedianMs) / obviousLane.benchMedianMs) * 100,
  };
}
