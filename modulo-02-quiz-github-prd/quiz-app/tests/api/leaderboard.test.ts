import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Level } from "@/lib/levels";
import type { SessionRow } from "@/lib/session";
import { createFakeDb } from "./fake-db";

type FakeDb = ReturnType<typeof createFakeDb>;

const fake = vi.hoisted(() => ({ db: null as FakeDb | null }));

vi.mock("@/lib/db/sessions", (): FakeDb["api"] => ({
  createSession: (...a) => fake.db!.api.createSession(...a),
  findSession: (...a) => fake.db!.api.findSession(...a),
  markExpired: (...a) => fake.db!.api.markExpired(...a),
  markServed: (...a) => fake.db!.api.markServed(...a),
  insertAnswer: (...a) => fake.db!.api.insertAnswer(...a),
  advanceSession: (...a) => fake.db!.api.advanceSession(...a),
  listAnswers: (...a) => fake.db!.api.listAnswers(...a),
}));
vi.mock("@/lib/db/leaderboard", (): FakeDb["leaderboard"] => ({
  insertEntry: (...a) => fake.db!.leaderboard.insertEntry(...a),
  hasEntry: (...a) => fake.db!.leaderboard.hasEntry(...a),
  listTop: (...a) => fake.db!.leaderboard.listTop(...a),
  findPosition: (...a) => fake.db!.leaderboard.findPosition(...a),
}));
vi.mock("@/lib/db/rate-limits", (): FakeDb["limits"] => ({
  hitRateLimit: (...a) => fake.db!.limits.hitRateLimit(...a),
}));

const { POST: submit } =
  await import("@/app/api/sessions/[id]/leaderboard/route");
const { GET: list } = await import("@/app/api/leaderboard/route");

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

let ipCounter = 0;
/** Cada chamada usa um IP novo, para o rate limit só pesar onde é testado. */
function post(body: unknown, ip = `203.0.113.${++ipCounter}`) {
  return new Request("http://test/api", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** Cria direto no banco falso uma sessão com o placar dado. */
async function session(
  score: number,
  totalTimeMs = 60_000,
  {
    level = "advanced",
    status = "completed",
  }: { level?: Level; status?: SessionRow["status"] } = {},
) {
  const row = await fake.db!.api.createSession({
    share_id: `share${Math.random().toString(36).slice(2, 7)}`,
    level,
    locale: "pt",
    question_ids: [],
    current_served_at: null,
    ip_hash: "x",
  });
  Object.assign(fake.db!.sessions.get(row.id)!, {
    score,
    total_time_ms: totalTimeMs,
    correct_count: 12,
    status,
  });
  return fake.db!.sessions.get(row.id)!;
}

async function register(row: SessionRow, nickname = "raissa_dev") {
  const res = await submit(post({ nickname }), ctx(row.id));
  return { res, body: await res.json() };
}

function get(query: string) {
  return list(new Request(`http://test/api/leaderboard?${query}`));
}

beforeEach(() => {
  fake.db = createFakeDb();
  vi.stubEnv("IP_HASH_SALT", "test-salt");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("POST /api/sessions/:id/leaderboard", () => {
  it("registra a partida com o placar do servidor e devolve a posição", async () => {
    await register(await session(3000));
    const row = await session(2000);

    const { res, body } = await register(row, "  ana  dados ");
    expect(res.status).toBe(201);
    expect(body).toEqual({ rank: 2, shareId: row.share_id });
    expect(fake.db!.entries[1]).toMatchObject({
      nickname: "ana dados",
      level: "advanced",
      score: 2000,
      correct_count: 12,
      total_time_ms: 60_000,
    });
  });

  it("ignora placar mandado pelo cliente", async () => {
    const row = await session(500);
    await submit(post({ nickname: "esperto", score: 99_999 }), ctx(row.id));
    expect(fake.db!.entries[0].score).toBe(500);
  });

  it("409 ao registrar a mesma sessão duas vezes", async () => {
    const row = await session(1000);
    await register(row);

    const { res, body } = await register(row, "outro_nome");
    expect(res.status).toBe(409);
    expect(body.error.code).toBe("ALREADY_SUBMITTED");
    expect(fake.db!.entries).toHaveLength(1);
  });

  it("registros simultâneos da mesma sessão: só um entra", async () => {
    const row = await session(1000);
    const results = await Promise.all([register(row), register(row)]);
    expect(results.map((r) => r.res.status).sort()).toEqual([201, 409]);
    expect(fake.db!.entries).toHaveLength(1);
  });

  it.each(["in_progress", "expired"] as const)(
    "403 para sessão %s",
    async (status) => {
      const { res, body } = await register(await session(100, 1, { status }));
      expect(res.status).toBe(403);
      expect(body.error.code).toBe("SESSION_NOT_COMPLETED");
    },
  );

  it.each([
    ["curto demais", "ab"],
    ["longo demais", "a".repeat(21)],
    ["caractere proibido", "raissa<script>"],
    ["palavrão", "Porra_dev"],
  ])("422 INVALID_NICKNAME: %s", async (_, nickname) => {
    const { res, body } = await register(await session(100), nickname);
    expect(res.status).toBe(422);
    expect(body.error.code).toBe("INVALID_NICKNAME");
    expect(fake.db!.entries).toHaveLength(0);
  });

  it("400 com corpo inválido", async () => {
    const row = await session(100);
    const res = await submit(post({ nickname: 42 }), ctx(row.id));
    expect(res.status).toBe(400);
  });

  it("404 para sessão inexistente ou id malformado", async () => {
    for (const id of ["nao-e-uuid", crypto.randomUUID()]) {
      const res = await submit(post({ nickname: "raissa" }), ctx(id));
      expect(res.status).toBe(404);
    }
  });

  it("429 a partir do 6º registro do mesmo IP em 10 min", async () => {
    const ip = "192.0.2.10";
    for (let i = 0; i < 5; i++) {
      const row = await session(100 + i);
      const res = await submit(post({ nickname: "raissa" }, ip), ctx(row.id));
      expect(res.status).toBe(201);
    }

    const row = await session(999);
    const res = await submit(post({ nickname: "raissa" }, ip), ctx(row.id));
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe("RATE_LIMITED");
  });
});

describe("GET /api/leaderboard", () => {
  it("ordena por score desc, depois tempo asc, depois data asc", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-01T12:00:00Z") });
    const rows = [
      ["lento", 2000, 90_000],
      ["antigo", 2000, 50_000],
      ["campeao", 3000, 99_000],
      ["novo", 2000, 50_000],
      ["ultimo", 100, 1_000],
    ] as const;
    for (const [nickname, score, time] of rows) {
      await register(await session(score, time), nickname);
      vi.advanceTimersByTime(1000);
    }

    const res = await get("level=advanced");
    expect(res.status).toBe(200);
    const { entries } = await res.json();
    expect(entries.map((e: { nickname: string }) => e.nickname)).toEqual([
      "campeao",
      "antigo",
      "novo",
      "lento",
      "ultimo",
    ]);
    expect(entries[0]).toEqual({
      rank: 1,
      nickname: "campeao",
      score: 3000,
      correct: 12,
      timeMs: 99_000,
      createdAt: "2026-11-01T12:00:02.000Z",
    });
  });

  it("separa por nível", async () => {
    await register(await session(100, 1, { level: "beginner" }), "iniciante");
    await register(await session(100), "avancado");

    const { entries } = await (await get("level=beginner")).json();
    expect(entries).toHaveLength(1);
    expect(entries[0].nickname).toBe("iniciante");
  });

  it("período 7d deixa de fora entradas antigas", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-01T12:00:00Z") });
    await register(await session(5000), "veterano");
    vi.setSystemTime(new Date("2026-11-10T12:00:00Z"));
    await register(await session(100), "recente");

    const all = await (await get("level=advanced&period=all")).json();
    const week = await (await get("level=advanced&period=7d")).json();
    expect(all.entries).toHaveLength(2);
    expect(week.entries).toEqual([
      expect.objectContaining({ rank: 1, nickname: "recente" }),
    ]);
  });

  it("respeita o limit e manda cache de 30s para a CDN", async () => {
    for (let i = 0; i < 3; i++) await register(await session(i * 10));
    const res = await get("level=advanced&limit=2");
    expect((await res.json()).entries).toHaveLength(2);
    expect(res.headers.get("cache-control")).toContain("s-maxage=30");
  });

  it.each([
    ["sem nível", ""],
    ["nível inválido", "level=expert"],
    ["período inválido", "level=advanced&period=30d"],
    ["limit acima de 50", "level=advanced&limit=51"],
  ])("400 INVALID_QUERY: %s", async (_, query) => {
    const res = await get(query);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_QUERY");
  });
});
