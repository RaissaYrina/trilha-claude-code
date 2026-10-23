import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";
import base from "./vitest.config.mts";

// Testes contra o Supabase local (`pnpm db:start`), com as variáveis do .env.local.
const envFile = path.join(import.meta.dirname, ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

// Spread em vez de mergeConfig, que concatenaria o `include` da suíte unitária.
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    coverage: { enabled: false },
  },
});
