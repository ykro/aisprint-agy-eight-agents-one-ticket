import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    include: ["shared/**/*.test.ts", "03-eight-agents-one-ticket/**/*.test.ts"]
  }
});
