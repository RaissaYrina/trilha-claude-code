import { describe, expect, it } from "vitest";
import { isPeriod, periodStart, toEntries } from "@/lib/leaderboard";

describe("periodStart", () => {
  const now = new Date("2026-11-15T12:00:00Z");

  it("'all' não tem início", () => {
    expect(periodStart("all", now)).toBeNull();
  });

  it("'7d' começa 7 dias antes", () => {
    expect(periodStart("7d", now)).toBe("2026-11-08T12:00:00.000Z");
  });
});

it("isPeriod", () => {
  expect(isPeriod("7d")).toBe(true);
  expect(isPeriod("30d")).toBe(false);
});

it("toEntries numera na ordem recebida e usa os nomes do contrato", () => {
  const row = {
    nickname: "a",
    score: 10,
    correct_count: 3,
    total_time_ms: 500,
    created_at: "2026-11-15T12:00:00Z",
  };
  expect(toEntries([row, { ...row, nickname: "b" }])).toEqual([
    {
      rank: 1,
      nickname: "a",
      score: 10,
      correct: 3,
      timeMs: 500,
      createdAt: "2026-11-15T12:00:00Z",
    },
    expect.objectContaining({ rank: 2, nickname: "b" }),
  ]);
});
