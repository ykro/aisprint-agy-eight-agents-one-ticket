import type { RunRecord } from "@aisprint/harness-core";
import type { Stats } from "./stats.js";
import {
  formatMmSs,
  formatThousands,
  formatRatio,
  formatSignedPct,
  formatScore,
  formatWeight,
  formatOrdinal,
} from "./format.js";

export interface FigureEntry {
  id: string;
  value: string | number;
  formatted: string;
  unit: string;
  source: string;
}

export type Figures = Record<string, FigureEntry>;

function laneIndex(run: RunRecord, strategy: string): number {
  return run.lanes.findIndex((l) => l.strategy === strategy);
}

export function buildFigures(run: RunRecord, stats: Stats): Figures {
  const figures: Figures = {};
  const add = (
    id: string,
    value: string | number,
    formatted: string,
    unit: string,
    source: string,
  ): void => {
    figures[id] = { id, value, formatted, unit, source };
  };

  const wi = laneIndex(run, stats.winner);
  const oi = laneIndex(run, stats.obviousStrategy);

  add("agents.count", stats.agentCount, String(stats.agentCount), "agents", "computed");
  add("run.id", run.runId, run.runId, "", "run.runId");
  add("winner.strategy", stats.winner, stats.winner, "", "run.winner");
  add("obvious.strategy", stats.obviousStrategy, stats.obviousStrategy, "", "constant");
  add("lanes.count", stats.laneCount, String(stats.laneCount), "lanes", "run.lanes.length");
  add("green.count", stats.greenCount, String(stats.greenCount), "lanes", "computed");
  add("excluded.count", stats.excludedCount, String(stats.excludedCount), "lanes", "computed");
  add("cohort.n", stats.cohortN, "n=" + stats.cohortN, "runs", "computed");
  add("winner.rankOrdinal", stats.winnerRank, formatOrdinal(stats.winnerRank), "rank", "computed");
  add("obvious.rankOrdinal", stats.obviousRank, formatOrdinal(stats.obviousRank), "rank", "computed");
  add("rubric.tests", run.weights.tests, formatWeight(run.weights.tests), "", "run.weights.tests");
  add("rubric.diff", run.weights.diff, formatWeight(run.weights.diff), "", "run.weights.diff");
  add("rubric.complexity", run.weights.complexity, formatWeight(run.weights.complexity), "", "run.weights.complexity");
  add("rubric.bench", run.weights.benchmark, formatWeight(run.weights.benchmark), "", "run.weights.benchmark");

  add("timeToGreen.min", stats.timeToGreenMin.value, formatMmSs(stats.timeToGreenMin.value), "m:ss", "run.lanes[" + stats.timeToGreenMin.laneIndex + "].timeToFirstGreenMs");
  add("timeToGreen.minStrategy", stats.timeToGreenMin.strategy, stats.timeToGreenMin.strategy, "", "run.lanes[" + stats.timeToGreenMin.laneIndex + "].strategy");
  add("timeToGreen.max", stats.timeToGreenMax.value, formatMmSs(stats.timeToGreenMax.value), "m:ss", "run.lanes[" + stats.timeToGreenMax.laneIndex + "].timeToFirstGreenMs");
  add("timeToGreen.maxStrategy", stats.timeToGreenMax.strategy, stats.timeToGreenMax.strategy, "", "run.lanes[" + stats.timeToGreenMax.laneIndex + "].strategy");
  add("winner.timeToGreen", stats.winnerTimeMs, formatMmSs(stats.winnerTimeMs), "m:ss", "run.lanes[" + wi + "].timeToFirstGreenMs");

  add("diff.min", stats.diffMin.value, formatThousands(stats.diffMin.value), "loc", "run.lanes[" + stats.diffMin.laneIndex + "].diffLines");
  add("diff.minStrategy", stats.diffMin.strategy, stats.diffMin.strategy, "", "run.lanes[" + stats.diffMin.laneIndex + "].strategy");
  add("diff.max", stats.diffMax.value, formatThousands(stats.diffMax.value), "loc", "run.lanes[" + stats.diffMax.laneIndex + "].diffLines");
  add("diff.maxStrategy", stats.diffMax.strategy, stats.diffMax.strategy, "", "run.lanes[" + stats.diffMax.laneIndex + "].strategy");
  add("diff.spreadRatio", stats.diffSpreadRatio, formatRatio(stats.diffSpreadRatio), "", "computed");

  add("token.min", stats.tokenMin.value, formatThousands(stats.tokenMin.value), "tokens", "run.lanes[" + stats.tokenMin.laneIndex + "].tokenCost");
  add("token.minStrategy", stats.tokenMin.strategy, stats.tokenMin.strategy, "", "run.lanes[" + stats.tokenMin.laneIndex + "].strategy");
  add("token.max", stats.tokenMax.value, formatThousands(stats.tokenMax.value), "tokens", "run.lanes[" + stats.tokenMax.laneIndex + "].tokenCost");
  add("token.maxStrategy", stats.tokenMax.strategy, stats.tokenMax.strategy, "", "run.lanes[" + stats.tokenMax.laneIndex + "].strategy");
  add("token.spreadRatio", stats.tokenSpreadRatio, formatRatio(stats.tokenSpreadRatio), "", "computed");

  add("winner.score", stats.winnerScore, formatScore(stats.winnerScore), "", "run.lanes[" + wi + "].score");
  add("obvious.score", stats.obviousScore, formatScore(stats.obviousScore), "", "run.lanes[" + oi + "].score");
  add("winner.benchMs", stats.winnerBenchMs, String(stats.winnerBenchMs), "ms", "run.lanes[" + wi + "].benchMedianMs");
  add("obvious.benchMs", stats.obviousBenchMs, String(stats.obviousBenchMs), "ms", "run.lanes[" + oi + "].benchMedianMs");
  add("winner.benchDeltaPct", stats.winnerBenchDeltaPct, formatSignedPct(stats.winnerBenchDeltaPct), "%", "computed");

  return figures;
}

export function serializeFigures(figures: Figures): string {
  return JSON.stringify(figures, null, 2) + "\n";
}

export function resolveSource(run: RunRecord, source: string): boolean {
  if (source.length === 0) return false;
  if (source === "computed" || source === "constant") return true;
  if (source === "run.runId") return typeof run.runId === "string";
  if (source === "run.spec") return typeof run.spec === "string";
  if (source === "run.winner") return typeof run.winner === "string";
  if (source === "run.lanes.length") return run.lanes.length > 0;

  const weightMatch = source.match(/^run\.weights\.(tests|diff|complexity|benchmark)$/);
  if (weightMatch) {
    return typeof run.weights[weightMatch[1] as any] === "number";
  }

  const laneMatch = source.match(/^run\.lanes\[(\d+)\]\.([a-zA-Z]+)$/);
  if (laneMatch) {
    const idx = Number(laneMatch[1]);
    const field = laneMatch[2]!;
    const lane = run.lanes[idx];
    if (!lane) return false;
    return field in lane;
  }
  return false;
}
