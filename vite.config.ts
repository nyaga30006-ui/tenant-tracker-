import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const path = id.replaceAll("\\", "/");
          if (path.includes("/node_modules/@firebase/") || path.includes("/node_modules/firebase/")) return "firebase-vendor";
        },
      },
    },
  },
  plugins: [react()],
  server: {
    port: 5173,
  },
  test: {
    environment: "jsdom",
    fileParallelism: false,
    include: ["src/**/*.test.{ts,tsx}"],
    maxWorkers: 1,
    pool: "threads",
    setupFiles: ["./src/test/setup.ts"],
  },
});
