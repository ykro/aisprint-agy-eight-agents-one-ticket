import { describe, it, expect } from "vitest";
import { complexity } from "./index.js";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

describe("complexity metric", () => {
  it("measures complexity", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "metrics-"));
    const file = path.join(tmp, "code.ts");
    await fs.writeFile(file, "export function f() {}");
    expect(complexity([file])).toBe(1);
    await fs.rm(tmp, { recursive: true, force: true });
  });
});
