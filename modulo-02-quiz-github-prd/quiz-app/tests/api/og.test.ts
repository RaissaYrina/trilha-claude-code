import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionRow } from "@/lib/session";
import { getShareSummary } from "@/lib/share-summary";
import { createFakeDb } from "./fake-db";

type FakeDb = ReturnType<typeof createFakeDb>;

const fake = vi.hoisted(() => ({ db: null as FakeDb | null }));

vi.mock("@/lib/db/sessions", (): FakeDb["api"] => ({
  createSession: (...a) => fake.db!.api.createSession(...a),
  findSession: (...a) => fake.db!.api.findSession(...a),
  findSessionByShareId: (...a) => fake.db!.api.findSessionByShareId(...a),
  markExpired: (...a) => fake.db!.api.markExpired(...a),
  markServed: (...a) => fake.db!.api.markServed(...a),
  insertAnswer: (...a) => fake.db!.api.insertAnswer(...a),
  advanceSession: (...a) => fake.db!.api.advanceSession(...a),
  listAnswers: (...a) => fake.db!.api.listAnswers(...a),
}));
vi.mock("@/lib/db/leaderboard", (): FakeDb["leaderboard"] => ({
  insertEntry: (...a) => fake.db!.leaderboard.insertEntry(...a),
  hasEntry: (...a) => fake.db!.leaderboard.hasEntry(...a),
  findNickname: (...a) => fake.db!.leaderboard.findNickname(...a),
  listTop: (...a) => fake.db!.leaderboard.listTop(...a),
  findPosition: (...a) => fake.db!.leaderboard.findPosition(...a),
}));

const { GET: og } = await import("@/app/api/og/[shareId]/route");

const ctx = (shareId: string) => ({ params: Promise.resolve({ shareId }) });

async function session(status: SessionRow["status"] = "completed") {
  const row = await fake.db!.api.createSession({
    share_id: `s${Math.random().toString(36).slice(2, 11)}`.padEnd(10, "x"),
    level: "advanced",
    locale: "pt",
    question_ids: Array.from({ length: 15 }, (_, i) => `adv-${i}`),
    current_served_at: null,
    ip_hash: "x",
  });
  Object.assign(fake.db!.sessions.get(row.id)!, {
    status,
    score: 1840,
    correct_count: 12,
  });
  return fake.db!.sessions.get(row.id)!;
}

beforeEach(() => {
  fake.db = createFakeDb();
});

describe("getShareSummary", () => {
  it("usa o apelido do ranking quando houver", async () => {
    const row = await session();
    expect((await getShareSummary(row.share_id))?.nickname).toBeNull();

    await fake.db!.leaderboard.insertEntry({
      session_id: row.id,
      nickname: "raissa_dev",
      level: "advanced",
      score: 1840,
      correct_count: 12,
      total_time_ms: 1,
    });
    expect(await getShareSummary(row.share_id)).toMatchObject({
      nickname: "raissa_dev",
      score: 1840,
      correct: 12,
      band: "specialist",
    });
  });

  it.each(["in_progress", "expired"] as const)(
    "não expõe partida %s",
    async (status) => {
      const row = await session(status);
      expect(await getShareSummary(row.share_id)).toBeNull();
    },
  );

  it("recusa id fora do formato sem ir ao banco", async () => {
    const spy = vi.spyOn(fake.db!.api, "findSessionByShareId");
    expect(await getShareSummary("../etc")).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("GET /api/og/:shareId", () => {
  it("gera um PNG 1200×630", async () => {
    const row = await session();
    const res = await og(
      new Request(`http://test/api/og/${row.share_id}?locale=en`),
      ctx(row.share_id),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");

    const png = new Uint8Array(await res.arrayBuffer());
    const view = new DataView(png.buffer);
    // Cabeçalho IHDR do PNG: largura e altura nos bytes 16–23.
    expect([view.getUint32(16), view.getUint32(20)]).toEqual([1200, 630]);
  }, 30_000);

  it("404 para resultado inexistente", async () => {
    const res = await og(
      new Request("http://test/api/og/naoexiste0"),
      ctx("naoexiste0"),
    );
    expect(res.status).toBe(404);
  });
});
