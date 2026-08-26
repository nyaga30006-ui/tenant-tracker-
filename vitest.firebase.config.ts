import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    include: ["tests/firebase/**/*.test.ts"],
    maxWorkers: 1,
    pool: "threads",
  },
});
