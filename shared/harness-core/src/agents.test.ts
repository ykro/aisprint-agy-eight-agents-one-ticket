import { describe, it, expect } from "vitest";
import { MockAgentProvider } from "./index.js";

describe("MockAgentProvider", () => {
  it("runs correctly", async () => {
    const provider = new MockAgentProvider((t) => ({
      output: t.id,
      tokensUsed: 1,
    }));
    const res = await provider.runAgent({ id: "1", role: "r", prompt: "p" });
    expect(res.output).toBe("1");
  });
});
