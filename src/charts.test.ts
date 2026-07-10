import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRun } from "./loader.js";
import { computeStats } from "./stats.js";
import { buildCharts } from "./charts.js";
import { contrastRatio, LIGHT, DARK } from "./palette.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(HERE, "..", "content", "data", "run-sample.json");
const stats = computeStats(parseRun(readFileSync(FIXTURE, "utf8")));
const charts = buildCharts(stats);

describe("charts", () => {
  it("emits the four expected charts in a stable order", () => {
    expect(charts.map((c) => c.id)).toEqual(["chart1", "chart2", "chart3", "chart4"]);
  });

  it("marks every SVG as an accessible image with a title and label", () => {
    for (const chart of charts) {
      expect(chart.svg).toContain('role="img"');
      expect(chart.svg).toContain("aria-label=");
      expect(chart.svg).toContain("<title>");
      expect(chart.svg).toContain("</title>");
    }
  });

  it("ships a data-table fallback with header/row scopes for every chart", () => {
    for (const chart of charts) {
      expect(chart.table).toContain('class="chart-table"');
      expect(chart.table).toContain("<caption>");
      expect(chart.table).toContain('scope="col"');
      expect(chart.table).toContain('scope="row"');
    }
  });

  it("lists every green lane and the excluded lane in the score table", () => {
    const scoreTable = charts[3]!.table; // chart4 = final rubric score
    for (const r of stats.ranking) {
      expect(scoreTable).toContain(r.strategy);
    }
    // The winner and the obvious pick are labelled so the fallback tells the story.
    expect(scoreTable).toContain("type-safe (winner)");
    expect(scoreTable).toContain("minimal-diff (obvious pick)");
  });

  it("keeps the excluded red lane visible in diff/token tables (not silently dropped)", () => {
    expect(charts[1]!.table).toContain("most-defensive"); // diff
    expect(charts[1]!.table).toContain("excluded");
    expect(charts[2]!.table).toContain("most-defensive"); // token
  });

  it("uses chart palettes that clear the WCAG AA contrast bar against the surface", () => {
    // Bars and ink must be legible on the chart surface in both themes.
    expect(contrastRatio(LIGHT.ink, LIGHT.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(DARK.ink, DARK.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(LIGHT.bar, LIGHT.surface)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(DARK.bar, DARK.surface)).toBeGreaterThanOrEqual(3);
  });
});
