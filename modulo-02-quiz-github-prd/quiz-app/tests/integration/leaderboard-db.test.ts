import { afterAll, describe, expect, it } from "vitest";
import {
  findPosition,
  hasEntry,
  insertEntry,
  listTop,
} from "@/lib/db/leaderboard";
import { hitRateLimit } from "@/lib/db/rate-limits";
import { createSession } from "@/lib/db/sessions";
import { getSupabase } from "@/lib/supabase/server";

const created: string[] = [];
const keys: string[] = [];

// Placar fora do alcance de partidas reais, para o teste não depender do que
// já existe no banco local.
const HUGE = 10_000_000;

async function entry(score: number, totalTimeMs: number, nickname = "it_test") {
  const row = await createSession({
    share_id: `it${Math.random().toString(36).slice(2, 10)}`,
    level: "intermediate",
    locale: "pt",
    question_ids: [],
    current_served_at: null,
    ip_hash: "integration-test",
  });
  created.push(row.id);
  const result = await insertEntry({
    session_id: row.id,
    nickname,
    level: "intermediate",
    score,
    correct_count: 15,
    total_time_ms: totalTimeMs,
  });
  return { row, result };
}

afterAll(async () => {
  const db = getSupabase();
  if (created.length > 0) {
    await db.from("leaderboard_entries").delete().in("session_id", created);
    await db.from("quiz_sessions").delete().in("id", created);
  }
  if (keys.length > 0) await db.from("rate_limits").delete().in("key", keys);
});

describe("lib/db/leaderboard contra o Postgres local", () => {
  it("o unique em session_id barra o segundo registro", async () => {
    const { row, result } = await entry(1, 1);
    expect(result).toBe("ok");
    expect(await hasEntry(row.id)).toBe(true);

    const again = await insertEntry({
      session_id: row.id,
      nickname: "de_novo",
      level: "intermediate",
      score: 1,
      correct_count: 1,
      total_time_ms: 1,
    });
    expect(again).toBe("duplicate");
  });

  it("listTop e leaderboard_position usam o mesmo desempate", async () => {
    const slow = await entry(HUGE, 90_000, "it_lento");
    const fast = await entry(HUGE, 50_000, "it_rapido");
    const tieLater = await entry(HUGE, 50_000, "it_empate");

    const top = await listTop("intermediate", null, 3);
    expect(top.map((e) => e.nickname)).toEqual([
      "it_rapido",
      "it_empate",
      "it_lento",
    ]);

    expect((await findPosition(fast.row.share_id, null))?.rank).toBe(1);
    expect((await findPosition(tieLater.row.share_id, null))?.rank).toBe(2);
    expect(await findPosition(slow.row.share_id, null)).toMatchObject({
      rank: 3,
      nickname: "it_lento",
      score: HUGE,
      total_time_ms: 90_000,
    });
  });

  it("leaderboard_position filtra pelo período", async () => {
    const { row } = await entry(2, 2);
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(await findPosition(row.share_id, future)).toBeNull();
    expect(await findPosition("nao-existe", null)).toBeNull();
  });
});

describe("lib/db/rate-limits contra o Postgres local", () => {
  it("rate_limit_hit conta de forma atômica", async () => {
    const key = `it:${crypto.randomUUID()}`;
    keys.push(key);
    const expires = new Date(Date.now() + 60_000).toISOString();

    const counts = await Promise.all(
      Array.from({ length: 5 }, () => hitRateLimit(key, expires)),
    );
    expect(counts.sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
