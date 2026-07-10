import { describe, it, expect } from "vitest";
import { AsyncTaskQueue } from "./index.js";

describe("AsyncTaskQueue", () => {
  it("drains queue", async () => {
    const queue = new AsyncTaskQueue(1);
    queue.add(async () => 1);
    const res = await queue.drain();
    expect(res).toHaveLength(1);
  });
});
