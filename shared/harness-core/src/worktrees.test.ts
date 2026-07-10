import { describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSandboxRepo } from "./index.js";

describe("worktrees sandbox", () => {
  it("creates sandbox", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wt-"));
    const src = path.join(tmp, "src");
    await fs.mkdir(src);
    await fs.writeFile(path.join(src, "package.json"), "{}");
    const dest = path.join(tmp, "dest");
    await createSandboxRepo(src, dest);
    expect(fs.stat(dest)).resolves.toBeDefined();
    await fs.rm(tmp, { recursive: true, force: true });
  });
});
