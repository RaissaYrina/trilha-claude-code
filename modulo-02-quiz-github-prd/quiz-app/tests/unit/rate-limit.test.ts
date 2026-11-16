import { beforeEach, describe, expect, it, vi } from "vitest";

const counts = vi.hoisted(() => new Map<string, number>());

vi.mock("@/lib/db/rate-limits", () => ({
  hitRateLimit: async (key: string) => {
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    return count;
  },
}));

const { checkRateLimit, rateLimitWindow, RATE_LIMITS } =
  await import("@/lib/rate-limit");

const rule = RATE_LIMITS.leaderboard;

beforeEach(() => counts.clear());

describe("rateLimitWindow", () => {
  it("usa janelas fixas de 10 min alinhadas ao relógio", () => {
    const a = rateLimitWindow(rule, "ip", new Date("2026-11-15T12:00:00Z"));
    const b = rateLimitWindow(rule, "ip", new Date("2026-11-15T12:09:59Z"));
    const c = rateLimitWindow(rule, "ip", new Date("2026-11-15T12:10:00Z"));

    expect(a.key).toBe(b.key);
    expect(c.key).not.toBe(a.key);
    expect(a.key).toMatch(/^leaderboard:ip:\d+$/);
    expect(a.expiresAt.toISOString()).toBe("2026-11-15T12:10:00.000Z");
  });

  it("separa por escopo e por IP", () => {
    const now = new Date();
    const keys = [
      rateLimitWindow(RATE_LIMITS.session, "ip1", now).key,
      rateLimitWindow(RATE_LIMITS.leaderboard, "ip1", now).key,
      rateLimitWindow(RATE_LIMITS.leaderboard, "ip2", now).key,
    ];
    expect(new Set(keys).size).toBe(3);
  });
});

describe("checkRateLimit", () => {
  it("libera até o limite e barra a seguinte, com o tempo até a virada", async () => {
    const now = new Date("2026-11-15T12:07:30Z");
    for (let i = 0; i < rule.limit; i++) {
      expect(await checkRateLimit(rule, "ip", now)).toEqual({ ok: true });
    }
    expect(await checkRateLimit(rule, "ip", now)).toEqual({
      ok: false,
      retryAfterSeconds: 150,
    });
  });

  it("zera na janela seguinte", async () => {
    const now = new Date("2026-11-15T12:00:00Z");
    for (let i = 0; i <= rule.limit; i++) await checkRateLimit(rule, "ip", now);

    const later = new Date("2026-11-15T12:10:00Z");
    expect(await checkRateLimit(rule, "ip", later)).toEqual({ ok: true });
  });
});
