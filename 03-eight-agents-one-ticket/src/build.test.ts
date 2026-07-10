import { describe, it, expect, afterAll } from "vitest";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { runBuild } from "./build.js";

const tempDirs: string[] = [];
function freshOut(): string {
  const dir = mkdtempSync(join(tmpdir(), "blog-test-"));
  tempDirs.push(dir);
  return join(dir, "dist");
}

afterAll(() => {
  for (const d of tempDirs) rmSync(d, { recursive: true, force: true });
});

describe("runBuild", () => {
  it("generates files", () => {
    const outDir = freshOut();
    const result = runBuild({ outDir });
    expect(result.htmlPath).toMatch(/article\.html$/);
    expect(result.chartPaths).toHaveLength(4);
  });
});
