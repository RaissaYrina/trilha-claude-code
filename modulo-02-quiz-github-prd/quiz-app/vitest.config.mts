import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${root}/` },
      // `server-only` lança erro fora do bundler do Next; nos testes vira um módulo vazio.
      {
        find: /^server-only$/,
        replacement: path.join(root, "tests/stubs/server-only.ts"),
      },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/{unit,components,api}/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      exclude: ["lib/utils.ts"],
      thresholds: {
        "lib/**": { lines: 80, functions: 80, branches: 80, statements: 80 },
        "lib/scoring.ts": { 100: true },
      },
    },
  },
});
