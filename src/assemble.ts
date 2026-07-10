import type { Figures } from "./figures.js";
import type { ChartArtifact } from "./charts.js";
import { esc } from "./charts.js";

const FIGURE_RE = /\{\{figure:([a-zA-Z0-9._]+)\}\}/g;
const CHART_RE = /\{\{chart:(\d+)\}\}/g;

export function extractFigureIds(markdown: string): string[] {
  const ids: string[] = [];
  for (const m of markdown.matchAll(FIGURE_RE)) {
    if (!ids.includes(m[1]!)) ids.push(m[1]!);
  }
  return ids;
}

export function extractChartSlots(markdown: string): number[] {
  const slots: number[] = [];
  for (const m of markdown.matchAll(CHART_RE)) slots.push(Number(m[1]));
  return slots;
}

const CHART_CAPTIONS: Record<string, string> = {
  chart1: "Time to first green by lane.",
  chart2: "Diff size per strategy, sorted ascending.",
  chart3: "Token cost per lane, sorted ascending.",
  chart4: "Final rubric score per green lane.",
};

function inline(text: string): string {
  const escaped = esc(text);
  return escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
}

function chartBlock(chart: ChartArtifact, figureNumber: number, runId: string): string {
  const caption = CHART_CAPTIONS[chart.id] ?? "";
  return [
    `<figure class="chart" id="${chart.id}">`,
    `<div class="chart-svg">${chart.svg}</div>`,
    `<figcaption>Figure ${figureNumber}. ${esc(caption)} Rendered from run <code>${esc(runId)}</code>.</figcaption>`,
    `<details class="chart-data"><summary>Show data table</summary>${chart.table}</details>`,
    `</figure>`,
  ].join("\n");
}

export function assembleArticleBody(
  markdown: string,
  figures: Figures,
  charts: ChartArtifact[],
): string {
  const injected = markdown.replace(FIGURE_RE, (_all, id: string) => {
    const entry = figures[id];
    if (!entry) throw new Error(`unresolved figure placeholder: ${id}`);
    return entry.formatted;
  });

  const runId = figures["run.id"]?.formatted ?? "";
  const byNumber = new Map<number, ChartArtifact>();
  charts.forEach((c, i) => byNumber.set(i + 1, c));

  const blocks = injected.split(/\n{2,}/);
  const html: string[] = [];

  for (const rawBlock of blocks) {
    const block = rawBlock.trim();
    if (block.length === 0) continue;

    const chartMatch = block.match(/^\{\{chart:(\d+)\}\}$/);
    if (chartMatch) {
      const n = Number(chartMatch[1]);
      const chart = byNumber.get(n);
      if (!chart) throw new Error(`unresolved chart slot: ${n}`);
      html.push(chartBlock(chart, n, runId));
      continue;
    }

    if (block.startsWith("# ")) {
      html.push(`<h1>${inline(block.slice(2).trim())}</h1>`);
    } else if (block.startsWith("## ")) {
      const heading = block.slice(3).trim();
      const id = heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      html.push(`<h2 id="${id}">${inline(heading)}</h2>`);
    } else {
      const text = block.replace(/\n/g, " ");
      html.push(`<p>${inline(text)}</p>`);
    }
  }

  return html.join("\n");
}

export function renderPage(body: string, title: string): string {
  const style = pageStyle();
  const toggle = themeToggleScript();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(title)}</title>
<style>${style}</style>
</head>
<body>
<header class="page-head">
<button type="button" id="theme-toggle" aria-label="Toggle light and dark theme">Toggle theme</button>
</header>
<main>
<article>
${body}
</article>
</main>
<script>${toggle}</script>
</body>
</html>
`;
}

function pageStyle(): string {
  return [
    ":root{--bg:#f9f9f7;--surface:#fcfcfb;--ink:#0b0b0b;--ink2:#52514e;--muted:#898781;--rule:#e1e0d9;--accent:#256abf;--code-bg:#f0efec;}",
    ':root[data-theme="dark"]{--bg:#0d0d0d;--surface:#1a1a19;--ink:#ffffff;--ink2:#c3c2b7;--muted:#898781;--rule:#2c2c2a;--accent:#3987e5;--code-bg:#242422;}',
    "@media (prefers-color-scheme: dark){:root{--bg:#0d0d0d;--surface:#1a1a19;--ink:#ffffff;--ink2:#c3c2b7;--muted:#898781;--rule:#2c2c2a;--accent:#3987e5;--code-bg:#242422;}}",
    "*{box-sizing:border-box;}",
    "body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,sans-serif;line-height:1.65;}",
    ".page-head{display:flex;justify-content:flex-end;padding:16px 24px;}",
    "#theme-toggle{font:inherit;font-size:13px;color:var(--ink2);background:var(--surface);border:1px solid var(--rule);border-radius:8px;padding:6px 12px;cursor:pointer;}",
    "main{max-width:760px;margin:0 auto;padding:0 24px 96px;}",
    "h1{font-size:34px;line-height:1.15;letter-spacing:-0.01em;margin:8px 0 24px;}",
    "h2{font-size:22px;margin:48px 0 12px;padding-top:8px;border-top:1px solid var(--rule);}",
    "p{margin:0 0 18px;color:var(--ink);font-size:17px;}",
    "code{font-family:monospace;font-size:0.85em;background:var(--code-bg);padding:1px 5px;border-radius:4px;}",
    ".chart{margin:28px 0 12px;padding:16px;background:var(--surface);border:1px solid var(--rule);border-radius:12px;}",
    ".chart-svg svg{width:100%;height:auto;max-width:100%;display:block;}",
    "figcaption{margin-top:10px;font-size:13px;color:var(--ink2);}",
    ".chart-data{margin-top:12px;}",
    ".chart-data summary{cursor:pointer;font-size:13px;color:var(--accent);}",
    "table.chart-table{border-collapse:collapse;width:100%;margin-top:12px;font-size:14px;}",
    "table.chart-table caption{text-align:left;color:var(--muted);font-size:13px;margin-bottom:6px;}",
    "table.chart-table th,table.chart-table td{border-bottom:1px solid var(--rule);padding:6px 10px;text-align:left;}",
    "table.chart-table th[scope='col']{color:var(--ink2);font-weight:600;}",
    "table.chart-table .num{text-align:right;font-variant-numeric:tabular-nums;}",
  ].join("");
}

function themeToggleScript(): string {
  return [
    "(function(){",
    "var b=document.getElementById('theme-toggle');",
    "if(!b)return;",
    "b.addEventListener('click',function(){",
    "var r=document.documentElement;",
    "var cur=r.getAttribute('data-theme');",
    "var next=cur==='dark'?'light':cur==='light'?'dark':(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'light':'dark');",
    "r.setAttribute('data-theme',next);",
    "});",
    "})();",
  ].join("");
}
