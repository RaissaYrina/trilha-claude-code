import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("getSupabase", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  it("falha com os nomes das variáveis que faltam", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const { getSupabase } = await import("@/lib/supabase/server");

    expect(() => getSupabase()).toThrow(
      /SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY/,
    );
  });

  it("cria o cliente uma vez e o reaproveita", async () => {
    vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
    const { getSupabase } = await import("@/lib/supabase/server");

    expect(getSupabase()).toBe(getSupabase());
  });
});
