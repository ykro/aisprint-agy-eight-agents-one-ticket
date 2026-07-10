import { mkdirSync, writeFileSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRun } from "./loader.js";
import { computeStats, type Stats } from "./stats.js";
import { buildFigures, serializeFigures, type Figures } from "./figures.js";
import { buildCharts, type ChartArtifact } from "./charts.js";
import { contrastRatio, LIGHT, DARK } from "./palette.js";
import {
  assembleArticleBody,
  renderPage,
  extractFigureIds,
  extractChartSlots,
} from "./assemble.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = resolve(HERE, "..");
const DEFAULT_RUN = resolve(PROJECT_DIR, "content", "data", "run-sample.json");
const ARTICLE_PATH = resolve(PROJECT_DIR, "content", "article.md");

export interface BuildOptions {
  runPath?: string;
  outDir?: string;
  articlePath?: string;
}

export interface BuildResult {
  outDir: string;
  htmlPath: string;
  figuresPath: string;
  chartPaths: string[];
  stats: Stats;
  figures: Figures;
  charts: ChartArtifact[];
}

function assertPlaceholderClosure(markdown: string, figures: Figures): void {
  const usedIds = new Set(extractFigureIds(markdown));
  const figureKeys = new Set(Object.keys(figures));

  const undefinedIds = [...usedIds].filter((id) => !figureKeys.has(id));
  if (undefinedIds.length > 0) {
    throw new Error(`missing figure references: ${undefinedIds.join(", ")}`);
  }
  const deadFigures = [...figureKeys].filter((id) => !usedIds.has(id));
  if (deadFigures.length > 0) {
    throw new Error(`unused figures: ${deadFigures.join(", ")}`);
  }

  const slots = extractChartSlots(markdown);
  const expected = [1, 2, 3, 4];
  if (slots.length !== expected.length || slots.some((s, i) => s !== expected[i])) {
    throw new Error(`chart slots mismatch`);
  }
}

export function runBuild(options: BuildOptions = {}): BuildResult {
  const runPath = options.runPath ?? DEFAULT_RUN;
  const articlePath = options.articlePath ?? ARTICLE_PATH;
  const outDir = options.outDir ?? resolve(PROJECT_DIR, "dist");

  const run = loadRun(runPath);
  const stats = computeStats(run);
  const figures = buildFigures(run, stats);
  const charts = buildCharts(stats);

  const markdown = readFileSync(articlePath, "utf8");
  assertPlaceholderClosure(markdown, figures);

  const body = assembleArticleBody(markdown, figures, charts);
  const html = renderPage(body, "Eight Agents, One Ticket");

  rmSync(outDir, { recursive: true, force: true });
  const chartsDir = resolve(outDir, "charts");
  mkdirSync(chartsDir, { recursive: true });

  const htmlPath = resolve(outDir, "article.html");
  writeFileSync(htmlPath, html);

  const figuresPath = resolve(outDir, "figures.json");
  writeFileSync(figuresPath, serializeFigures(figures));

  const chartPaths = charts.map((c) => {
    const p = resolve(chartsDir, `${c.id}.svg`);
    writeFileSync(p, c.svg + "\n");
    return p;
  });

  return { outDir, htmlPath, figuresPath, chartPaths, stats, figures, charts };
}

function parseArgs(argv: string[]): BuildOptions {
  const options: BuildOptions = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--run") {
      const next = argv[i + 1];
      if (!next) throw new Error("--run requires a path argument");
      options.runPath = resolve(process.cwd(), next);
      i++;
    }
  }
  return options;
}

const AA_TEXT = 4.5;

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KiB`;
}

function sizeOf(path: string): string {
  return fmtBytes(statSync(path).size);
}

function rel(from: string, to: string): string {
  const r = relative(from, to);
  return r.startsWith("..") ? to : r;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const runPath = options.runPath ?? DEFAULT_RUN;
  const result = runBuild(options);
  const { stats, figures, charts, outDir } = result;

  const log = (line: string): void => console.log(line);

  log("Eight Agents, One Ticket -- static blog build");
  log("");
  log(`Run record   : ${rel(PROJECT_DIR, runPath)}`);
  log(`  runId      : ${stats.runId}`);
  log(`  lanes      : ${stats.laneCount} (${stats.greenCount} green, ${stats.excludedCount} excluded)`);
  log(`  winner     : ${stats.winner} (rank ${stats.winnerRank})`);
  log(`  obvious    : ${stats.obviousStrategy} (rank ${stats.obviousRank})`);
  log("");
  log(`Figures      : ${Object.keys(figures).length} computed from the run record`);
  log(`Charts       : ${charts.length} rendered as inline SVG`);
  for (const c of charts) {
    log(`  - ${c.id}.svg`);
  }
  log("");

  // WCAG AA contrast gate for chart text against its own surface, both themes.
  const lightCr = contrastRatio(LIGHT.ink, LIGHT.surface);
  const darkCr = contrastRatio(DARK.ink, DARK.surface);
  const verdict = (cr: number): string => (cr >= AA_TEXT ? "PASS" : "FAIL");
  log(
    `WCAG AA text : light ${lightCr.toFixed(1)}:1 ${verdict(lightCr)}, ` +
      `dark ${darkCr.toFixed(1)}:1 ${verdict(darkCr)} (threshold ${AA_TEXT}:1)`,
  );
  log("");

  log(`Written to   : ${rel(PROJECT_DIR, outDir)}/`);
  log(`  article.html   ${sizeOf(result.htmlPath)}`);
  log(`  figures.json   ${sizeOf(result.figuresPath)}`);
  for (const p of result.chartPaths) {
    log(`  charts/${p.replace(/.*\//, "").padEnd(9)}   ${sizeOf(p)}`);
  }
  log("");
  log("Build complete. Serve with: pnpm server");

  if (lightCr < AA_TEXT || darkCr < AA_TEXT) {
    throw new Error("WCAG AA contrast gate failed");
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main();
}
