import { describe, it, expect, afterAll } from "vitest";
import { readFileSync, readdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { runBuild } from "./build.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ARTICLE_MD = resolve(HERE, "..", "content", "article.md");

const tempDirs: string[] = [];
function freshOut(): string {
  const dir = mkdtempSync(join(tmpdir(), "blog-test-"));
  tempDirs.push(dir);
  return join(dir, "dist");
}

function walk(root: string): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  const visit = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) visit(full);
      else out.set(relative(root, full), readFileSync(full));
    }
  };
  visit(root);
  return out;
}

afterAll(() => {
  for (const d of tempDirs) rmSync(d, { recursive: true, force: true });
});

describe("runBuild", () => {
  it("emits the article, four charts, and the figures manifest", () => {
    const outDir = freshOut();
    const result = runBuild({ outDir });
    expect(result.htmlPath).toMatch(/article\.html$/);
    expect(result.figuresPath).toMatch(/figures\.json$/);
    expect(result.chartPaths).toHaveLength(4);
    expect(result.chartPaths.map((p) => p.replace(/.*\//, ""))).toEqual([
      "chart1.svg",
      "chart2.svg",
      "chart3.svg",
      "chart4.svg",
    ]);
  });

  it("produces a self-contained HTML page with no external references", () => {
    const outDir = freshOut();
    const { htmlPath } = runBuild({ outDir });
    const html = readFileSync(htmlPath, "utf8");
    // No linked stylesheets, scripts, images, imports, or fetches.
    expect(html).not.toMatch(/\ssrc\s*=/);
    expect(html).not.toContain("<link");
    expect(html).not.toContain("@import");
    expect(html).not.toMatch(/href\s*=\s*"https?:/i);
    expect(html).not.toMatch(/url\(\s*['"]?https?:/i);
    // The only http(s) token allowed is the SVG XML namespace, never a fetchable asset.
    for (const m of html.match(/https?:\/\/[^\s"')]+/g) ?? []) {
      expect(m).toBe("http://www.w3.org/2000/svg");
    }
    // Styles and behaviour are inlined.
    expect(html).toContain("<style>");
    expect(html).toContain("<script>");
  });

  it("inlines four accessible charts with SVG titles and table fallbacks", () => {
    const outDir = freshOut();
    const { htmlPath } = runBuild({ outDir });
    const html = readFileSync(htmlPath, "utf8");
    expect((html.match(/role="img"/g) ?? []).length).toBe(4);
    // One document <title> in <head> plus one accessible <title> inside each of the 4 SVGs.
    expect((html.match(/<title>/g) ?? []).length).toBe(5);
    expect((html.match(/class="chart-table"/g) ?? []).length).toBe(4);
    expect((html.match(/<details/g) ?? []).length).toBe(4);
  });

  it("hand-types no numbers in the prose: every digit comes from a figure placeholder", () => {
    const md = readFileSync(ARTICLE_MD, "utf8");
    // Remove {{figure:...}} and {{chart:N}} placeholders, then assert nothing numeric remains.
    const withoutPlaceholders = md.replace(/\{\{[^}]+\}\}/g, "");
    expect(withoutPlaceholders).not.toMatch(/[0-9]/);
    // Sanity: the source really does contain placeholders (the test would be vacuous otherwise).
    expect(md).toMatch(/\{\{figure:[a-zA-Z0-9._]+\}\}/);
  });

  it("is byte-for-byte deterministic across two independent builds", () => {
    const a = runBuild({ outDir: freshOut() });
    const b = runBuild({ outDir: freshOut() });
    const filesA = walk(a.outDir);
    const filesB = walk(b.outDir);
    expect([...filesB.keys()].sort()).toEqual([...filesA.keys()].sort());
    for (const [rel, bufA] of filesA) {
      const bufB = filesB.get(rel);
      expect(bufB, `missing ${rel} in second build`).toBeDefined();
      expect(Buffer.compare(bufA, bufB!), `${rel} differs between builds`).toBe(0);
    }
  });
});
