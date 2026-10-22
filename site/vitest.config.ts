import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "indexer/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**", "indexer/**"],
      exclude: ["src/main.tsx", "indexer/cli.ts", "**/*.test.*", "src/test/**", "indexer/__fixtures__/**"],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 80 },
    },
  },
});
