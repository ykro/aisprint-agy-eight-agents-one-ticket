import { chartStyleBlock } from "./palette.js";
import { formatMmSs, formatThousands, formatRatio, formatScore } from "./format.js";
import type { Stats } from "./stats.js";

const W = 760;
const PAD_L = 184;
const PAD_R = 116;
const TOP = 74;
const ROW_H = 38;
const BAR_H = 18;
const BOTTOM = 46;
const PLOT_W = W - PAD_L - PAD_R;
const FONT = "system-ui, -apple-system, sans-serif";

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function f(x: number): string {
  return (Math.round(x * 100) / 100).toString();
}

type RowKind = "bar" | "accent" | "deemph" | "excluded" | "dng";

interface BarRow {
  label: string;
  value: number;
  valueText: string;
  kind: RowKind;
  ring?: boolean;
  note?: string;
}

interface BarChartOptions {
  ariaLabel: string;
  title: string;
  subtitle: string;
  axisLabel: string;
  maxValue: number;
  rows: BarRow[];
}

function fillFor(kind: RowKind): string {
  switch (kind) {
    case "accent":
      return "var(--accent)";
    case "deemph":
      return "var(--deemph)";
    case "excluded":
      return "url(#hatch)";
    default:
      return "var(--bar)";
  }
}

function barChartSvg(opts: BarChartOptions): string {
  const height = TOP + opts.rows.length * ROW_H + BOTTOM;
  const parts: string[] = [];

  parts.push(
    `<svg class="viz" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height}" ` +
      `width="${W}" height="${height}" role="img" aria-label="${esc(opts.ariaLabel)}" ` +
      `font-family="${FONT}">`
  );
  parts.push(`<style>${chartStyleBlock()}</style>`);
  parts.push(
    `<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" ` +
      `patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--surface)"/>` +
      `<line x1="0" y1="0" x2="0" y2="6" stroke="var(--hatch)" stroke-width="2"/></pattern></defs>`
  );
  parts.push(`<title>${esc(opts.ariaLabel)}</title>`);
  parts.push(`<rect x="0" y="0" width="${W}" height="${height}" fill="var(--surface)"/>`);

  parts.push(`<text x="16" y="28" fill="var(--ink)" font-size="17" font-weight="600">${esc(opts.title)}</text>`);
  parts.push(`<text x="16" y="48" fill="var(--ink2)" font-size="12.5">${esc(opts.subtitle)}</text>`);

  const plotTop = TOP;
  const plotBottom = TOP + opts.rows.length * ROW_H;

  parts.push(`<line x1="${PAD_L}" y1="${plotTop - 8}" x2="${PAD_L}" y2="${plotBottom}" stroke="var(--axis)" stroke-width="1"/>`);

  opts.rows.forEach((row, i) => {
    const cy = plotTop + i * ROW_H + ROW_H / 2;
    const barY = cy - BAR_H / 2;

    parts.push(`<text x="${PAD_L - 12}" y="${cy + 4}" text-anchor="end" fill="var(--ink)" font-size="13">${esc(row.label)}</text>`);

    if (row.kind === "dng") {
      const mw = 54;
      parts.push(`<rect x="${PAD_L}" y="${barY}" width="${mw}" height="${BAR_H}" rx="4" fill="url(#hatch)" stroke="var(--axis)" stroke-width="1"/>`);
      parts.push(`<text x="${PAD_L + mw + 10}" y="${cy + 4}" fill="var(--ink2)" font-size="13">${esc(row.valueText)}</text>`);
      return;
    }

    const ratio = opts.maxValue > 0 ? row.value / opts.maxValue : 0;
    const barW = Math.max(2, ratio * PLOT_W);

    parts.push(`<rect x="${PAD_L}" y="${barY}" width="${f(barW)}" height="${BAR_H}" rx="4" fill="${fillFor(row.kind)}"/>`);
    if (row.kind === "excluded") {
      parts.push(`<rect x="${PAD_L}" y="${barY}" width="${f(barW)}" height="${BAR_H}" rx="4" fill="none" stroke="var(--axis)" stroke-width="1"/>`);
    }
    if (row.ring) {
      parts.push(`<rect x="${PAD_L - 2}" y="${barY - 3}" width="${f(barW + 4)}" height="${BAR_H + 6}" rx="6" fill="none" stroke="var(--ink)" stroke-width="2"/>`);
    }

    let labelX = PAD_L + barW + 10;
    parts.push(`<text x="${f(labelX)}" y="${cy + 4}" fill="var(--ink2)" font-size="13" font-weight="600">${esc(row.valueText)}</text>`);
    if (row.note) {
      labelX += row.valueText.length * 8 + 10;
      parts.push(`<text x="${f(labelX)}" y="${cy + 4}" fill="var(--muted)" font-size="12">${esc(row.note)}</text>`);
    }
  });

  parts.push(`<text x="${PAD_L + PLOT_W / 2}" y="${plotBottom + 30}" text-anchor="middle" fill="var(--muted)" font-size="12">${esc(opts.axisLabel)}</text>`);
  parts.push(`</svg>`);
  return parts.join("\n");
}

function barTable(caption: string, columns: any[], rows: string[][]): string {
  const thead = columns
    .map((c) => `<th scope="col" class="${c.align === "right" ? "num" : ""}">${esc(c.header)}</th>`)
    .join("");
  const tbody = rows
    .map((cells) => {
      const tds = cells
        .map((cell, i) => {
          const align = columns[i]?.align === "right" ? ' class="num"' : "";
          if (i === 0) return `<th scope="row"${align}>${esc(cell)}</th>`;
          return `<td${align}>&nbsp;${esc(cell)}</td>`;
        })
        .join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");
  return `<table class="chart-table"><caption>${esc(caption)}</caption><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`;
}

export interface ChartArtifact {
  id: string;
  svg: string;
  table: string;
}

export function chartTimeToGreen(stats: Stats): ChartArtifact {
  const rows: BarRow[] = stats.timeToGreen.map((m) => ({
    label: m.strategy,
    value: m.value,
    valueText: formatMmSs(m.value),
    kind: "bar",
    ring: m.strategy === stats.winner,
    note: m.strategy === stats.winner ? "winner" : undefined,
  }));
  for (const d of stats.didNotGreen) {
    rows.push({ label: d.strategy, value: 0, valueText: "did not green", kind: "dng" });
  }
  const svg = barChartSvg({
    ariaLabel: "Time to first green by lane.",
    title: "Time to first all-green, by lane",
    subtitle: "Elapsed from fan-out to the lane's first passing test run. Winner ringed.",
    axisLabel: "elapsed time (m:ss)",
    maxValue: stats.timeToGreenMax.value,
    rows,
  });
  const table = barTable(
    "Time to first green by lane",
    [{ header: "Strategy" }, { header: "Time to first green", align: "right" }, { header: "Status" }],
    [
      ...stats.timeToGreen.map((m) => [m.strategy, formatMmSs(m.value), m.strategy === stats.winner ? "green (winner)" : "green"]),
      ...stats.didNotGreen.map((m) => [m.strategy, "did not green", "excluded"]),
    ]
  );
  return { id: "chart1", svg, table };
}

export function chartDiffSize(stats: Stats): ChartArtifact {
  const rows: BarRow[] = stats.diff.map((m) => ({
    label: m.strategy,
    value: m.value,
    valueText: `${formatThousands(m.value)} loc`,
    kind: m.status === "red" ? "excluded" : "bar",
    ring: m.strategy === stats.winner,
    note: m.strategy === stats.winner ? "winner" : undefined,
  }));
  const svg = barChartSvg({
    ariaLabel: "Diff size in lines changed per strategy.",
    title: "Diff size per strategy",
    subtitle: `Lines changed. Spread ${formatRatio(stats.diffSpreadRatio)} leanest to largest. Excluded lane hatched.`,
    axisLabel: "lines changed (loc)",
    maxValue: stats.diffMax.value,
    rows,
  });
  const table = barTable(
    "Diff size per strategy",
    [{ header: "Strategy" }, { header: "Lines changed", align: "right" }, { header: "Status" }],
    stats.diff.map((m) => [m.strategy, formatThousands(m.value), m.status === "red" ? "excluded" : m.strategy === stats.winner ? "green (winner)" : "green"])
  );
  return { id: "chart2", svg, table };
}

export function chartTokenCost(stats: Stats): ChartArtifact {
  const rows: BarRow[] = stats.token.map((m) => ({
    label: m.strategy,
    value: m.value,
    valueText: formatThousands(m.value),
    kind: m.status === "red" ? "excluded" : "bar",
    ring: m.strategy === stats.winner,
    note: m.strategy === stats.winner ? "winner" : undefined,
  }));
  const svg = barChartSvg({
    ariaLabel: "Token cost per lane.",
    title: "Token cost per lane",
    subtitle: `Total tokens per lane subagent. Spread ${formatRatio(stats.tokenSpreadRatio)} cheapest to most expensive.`,
    axisLabel: "total tokens",
    maxValue: stats.tokenMax.value,
    rows,
  });
  const table = barTable(
    "Token cost per lane",
    [{ header: "Strategy" }, { header: "Tokens", align: "right" }, { header: "Status" }],
    stats.token.map((m) => [m.strategy, formatThousands(m.value), m.status === "red" ? "excluded" : m.strategy === stats.winner ? "green (winner)" : "green"])
  );
  return { id: "chart3", svg, table };
}

export function chartObviousLost(stats: Stats): ChartArtifact {
  const rows: BarRow[] = stats.ranking.map((r) => {
    const isWinner = r.strategy === stats.winner;
    const isObvious = r.strategy === stats.obviousStrategy;
    return {
      label: r.strategy,
      value: r.score,
      valueText: formatScore(r.score),
      kind: isWinner ? "accent" : "deemph",
      ring: isWinner,
      note: isWinner ? "winner" : isObvious ? `obvious pick, ${ordinalNote(r.rank)}` : undefined,
    };
  });
  const maxScore = Math.max(...stats.ranking.map((r) => r.score));
  const svg = barChartSvg({
    ariaLabel: "Final rubric score per green lane.",
    title: "Final rubric score: the obvious pick lost",
    subtitle: `n=1, single run. Winner in accent; the obvious minimal-diff pick ranked ${ordinalNote(stats.obviousRank)}.`,
    axisLabel: "final rubric score (higher is better)",
    maxValue: maxScore,
    rows,
  });
  const table = barTable(
    "Final rubric score per green lane",
    [{ header: "Rank", align: "right" }, { header: "Strategy" }, { header: "Score", align: "right" }],
    stats.ranking.map((r) => [String(r.rank), r.strategy + (r.strategy === stats.winner ? " (winner)" : r.strategy === stats.obviousStrategy ? " (obvious pick)" : ""), formatScore(r.score)])
  );
  return { id: "chart4", svg, table };
}

function ordinalNote(rank: number): string {
  const mod10 = rank % 10;
  const mod100 = rank % 100;
  let suffix = "th";
  if (mod100 < 11 || mod100 > 13) {
    if (mod10 === 1) suffix = "st";
    else if (mod10 === 2) suffix = "nd";
    else if (mod10 === 3) suffix = "rd";
  }
  return `${rank}${suffix}`;
}

export function buildCharts(stats: Stats): ChartArtifact[] {
  return [chartTimeToGreen(stats), chartDiffSize(stats), chartTokenCost(stats), chartObviousLost(stats)];
}
