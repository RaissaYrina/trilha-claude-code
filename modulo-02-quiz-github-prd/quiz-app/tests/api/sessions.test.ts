import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getQuestion } from "@/lib/questions/loader";
import { SESSION_TTL_MS } from "@/lib/session";
import { createFakeDb } from "./fake-db";

type FakeDb = ReturnType<typeof createFakeDb>;
type Api = FakeDb["api"];

// Um banco em memória novo a cada teste; o mock delega para o da vez.
const fake = vi.hoisted(() => ({ db: null as FakeDb | null }));

vi.mock("@/lib/db/sessions", (): Api => ({
  createSession: (...a) => fake.db!.api.createSession(...a),
  findSession: (...a) => fake.db!.api.findSession(...a),
  markExpired: (...a) => fake.db!.api.markExpired(...a),
  markServed: (...a) => fake.db!.api.markServed(...a),
  insertAnswer: (...a) => fake.db!.api.insertAnswer(...a),
  advanceSession: (...a) => fake.db!.api.advanceSession(...a),
  listAnswers: (...a) => fake.db!.api.listAnswers(...a),
}));

const { POST: createSession } = await import("@/app/api/sessions/route");
const { GET: getSession } = await import("@/app/api/sessions/[id]/route");
const { POST: answer } = await import("@/app/api/sessions/[id]/answer/route");

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://test/api", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function start(level = "beginner", locale = "pt") {
  const res = await createSession(post({ level, locale }));
  return { res, body: await res.json() };
}

/** Responde corretamente (lendo o gabarito do banco, como o E2E fará). */
async function answerCorrectly(sessionId: string, index: number) {
  const row = fake.db!.sessions.get(sessionId)!;
  const question = getQuestion(row.question_ids[index])!;
  return answer(post({ index, answer: question.answer }), ctx(sessionId));
}

const GABARITO = ["answer", "correctAnswer", "explanation", "docUrl"];

/** Todas as chaves de um JSON, em qualquer profundidade. */
function deepKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(deepKeys);
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => [k, ...deepKeys(v)]);
  }
  return [];
}

beforeEach(() => {
  fake.db = createFakeDb();
  vi.stubEnv("IP_HASH_SALT", "test-salt");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("POST /api/sessions", () => {
  it("cria a sessão com 15 perguntas e entrega a primeira", async () => {
    const { res, body } = await start("advanced", "en");

    expect(res.status).toBe(201);
    expect(body.total).toBe(15);
    expect(body.question.index).toBe(0);
    expect(body.question.id).toMatch(/^adv-/);
    const row = fake.db!.sessions.get(body.sessionId)!;
    expect(row.question_ids).toHaveLength(15);
    expect(row.share_id).toHaveLength(10);
    expect(row.current_served_at).not.toBeNull();
  });

  it("guarda o hash do IP, não o IP", async () => {
    const spy = vi.spyOn(fake.db!.api, "createSession");
    await createSession(
      post(
        { level: "beginner", locale: "pt" },
        {
          "x-forwarded-for": "203.0.113.7, 10.0.0.1",
        },
      ),
    );
    const { ip_hash } = spy.mock.calls[0][0];
    expect(ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(ip_hash).not.toContain("203.0.113.7");
  });

  it.each([
    ["nível inválido", { level: "expert", locale: "pt" }],
    ["locale inválido", { level: "beginner", locale: "es" }],
    ["JSON quebrado", "{"],
  ])("400 para %s", async (_, body) => {
    const res = await createSession(post(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_BODY");
  });

  it("500 sem detalhes quando falta configuração", async () => {
    vi.stubEnv("IP_HASH_SALT", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await createSession(post({ level: "beginner", locale: "pt" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Erro interno." },
    });
  });
});

describe("POST /api/sessions/:id/answer", () => {
  it("fluxo feliz: 15 respostas certas concluem a partida", async () => {
    const { body } = await start();
    let last: Record<string, unknown> = {};
    for (let index = 0; index < 15; index++) {
      const res = await answerCorrectly(body.sessionId, index);
      expect(res.status).toBe(200);
      last = await res.json();
      expect(last.correct).toBe(true);
      expect((last.points as number) > 0).toBe(true);
      if (index < 14) expect(last.next).toMatchObject({ index: index + 1 });
    }

    expect(last).toMatchObject({ completed: true, next: null, streak: 15 });
    const row = fake.db!.sessions.get(body.sessionId)!;
    expect(row.status).toBe("completed");
    expect(row.correct_count).toBe(15);
    expect(row.completed_at).not.toBeNull();
  });

  it("revela gabarito, explicação e doc só depois de responder", async () => {
    const { body } = await start("intermediate", "en");
    const row = fake.db!.sessions.get(body.sessionId)!;
    const question = getQuestion(row.question_ids[0])!;

    const res = await answer(
      post({ index: 0, answer: !question.answer }),
      ctx(body.sessionId),
    );
    expect(await res.json()).toMatchObject({
      correct: false,
      correctAnswer: question.answer,
      explanation: question.explanation.en,
      docUrl: question.docUrl,
      points: 0,
      streak: 0,
      completed: false,
    });
  });

  it("calcula o tempo no servidor a partir da entrega da pergunta", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-22T12:00:00Z") });
    const { body } = await start();
    vi.setSystemTime(new Date("2026-10-22T12:00:10Z"));

    const res = await answerCorrectly(body.sessionId, 0);
    // 10s: metade do bônus do iniciante (100 + 25) × 1,0
    expect(await res.json()).toMatchObject({
      timeMs: 10_000,
      bonus: 25,
      points: 125,
    });
  });

  it("409 ao responder de novo a mesma pergunta", async () => {
    const { body } = await start();
    await answerCorrectly(body.sessionId, 0);

    const res = await answer(
      post({ index: 0, answer: true }),
      ctx(body.sessionId),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("ALREADY_ANSWERED");
    expect(fake.db!.answers).toHaveLength(1);
  });

  it("respostas simultâneas: só uma é registrada", async () => {
    const { body } = await start();
    const results = await Promise.all([
      answerCorrectly(body.sessionId, 0),
      answerCorrectly(body.sessionId, 0),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(fake.db!.sessions.get(body.sessionId)!.current_index).toBe(1);
  });

  it("409 ao responder uma partida já concluída", async () => {
    const { body } = await start();
    for (let i = 0; i < 15; i++) await answerCorrectly(body.sessionId, i);
    const res = await answer(
      post({ index: 14, answer: true }),
      ctx(body.sessionId),
    );
    expect(res.status).toBe(409);
  });

  it.each([
    ["pulando a pergunta atual", 3],
    ["fora da partida", 15],
  ])("400 INVALID_INDEX %s", async (_, index) => {
    const { body } = await start();
    const res = await answer(
      post({ index, answer: true }),
      ctx(body.sessionId),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_INDEX");
  });

  it("400 com corpo inválido", async () => {
    const { body } = await start();
    const res = await answer(
      post({ index: 0, answer: "sim" }),
      ctx(body.sessionId),
    );
    expect(res.status).toBe(400);
  });

  it("410 e marca como expirada após 60 min sem atividade", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-22T12:00:00Z") });
    const { body } = await start();
    vi.setSystemTime(Date.now() + SESSION_TTL_MS + 1);

    const res = await answerCorrectly(body.sessionId, 0);
    expect(res.status).toBe(410);
    expect((await res.json()).error.code).toBe("SESSION_EXPIRED");
    expect(fake.db!.sessions.get(body.sessionId)!.status).toBe("expired");
  });

  it("404 para sessão inexistente ou id malformado", async () => {
    for (const id of ["nao-e-uuid", crypto.randomUUID()]) {
      const res = await answer(post({ index: 0, answer: true }), ctx(id));
      expect(res.status).toBe(404);
    }
  });
});

describe("GET /api/sessions/:id", () => {
  const get = (id: string, query = "") =>
    getSession(new Request(`http://test/api/sessions/${id}${query}`), ctx(id));

  it("retoma a partida no mesmo índice e placar", async () => {
    const { body } = await start();
    await answerCorrectly(body.sessionId, 0);
    await answerCorrectly(body.sessionId, 1);

    const res = await get(body.sessionId);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      status: "in_progress",
      index: 2,
      total: 15,
      streak: 2,
      correctCount: 2,
      question: { index: 2 },
    });
  });

  it("recarregar não zera o cronômetro da pergunta", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-22T12:00:00Z") });
    const { body } = await start();
    vi.setSystemTime(new Date("2026-10-22T12:00:08Z"));
    await get(body.sessionId);
    vi.setSystemTime(new Date("2026-10-22T12:00:12Z"));

    const res = await answerCorrectly(body.sessionId, 0);
    expect((await res.json()).timeMs).toBe(12_000);
  });

  it("grava a entrega se ainda não houver uma", async () => {
    const { body } = await start();
    fake.db!.sessions.get(body.sessionId)!.current_served_at = null;
    await get(body.sessionId);
    expect(
      fake.db!.sessions.get(body.sessionId)!.current_served_at,
    ).not.toBeNull();
  });

  it("usa o locale pedido na query", async () => {
    const { body } = await start("beginner", "pt");
    const row = fake.db!.sessions.get(body.sessionId)!;
    const question = getQuestion(row.question_ids[0])!;

    const res = await get(body.sessionId, "?locale=en");
    expect((await res.json()).question.statement).toBe(question.statement.en);
  });

  it("partida concluída devolve o resumo com a revisão", async () => {
    const { body } = await start("advanced");
    for (let i = 0; i < 15; i++) await answerCorrectly(body.sessionId, i);

    const res = await get(body.sessionId);
    const state = await res.json();
    expect(state).toMatchObject({
      status: "completed",
      correctCount: 15,
      maxStreak: 15,
      maxScore: 6300,
      band: "master",
    });
    expect(state.review).toHaveLength(15);
    expect(state.review[0]).toHaveProperty("correctAnswer");
  });

  it("410 para sessão expirada", async () => {
    const { body } = await start();
    fake.db!.sessions.get(body.sessionId)!.status = "expired";
    expect((await get(body.sessionId)).status).toBe(410);
  });

  it("404 para sessão inexistente", async () => {
    expect((await get(crypto.randomUUID())).status).toBe(404);
    expect((await get("123")).status).toBe(404);
  });
});

describe("não-vazamento do gabarito", () => {
  it("POST /sessions e GET /sessions/:id em andamento não expõem o gabarito", async () => {
    const { body } = await start();
    const resumed = await (
      await getSession(new Request("http://test"), ctx(body.sessionId))
    ).json();

    for (const json of [body, resumed]) {
      const keys = deepKeys(json);
      for (const forbidden of GABARITO) expect(keys).not.toContain(forbidden);
    }
  });

  it("a próxima pergunta entregue junto com a resposta também não expõe o gabarito", async () => {
    const { body } = await start();
    const res = await answerCorrectly(body.sessionId, 0);
    const { next } = await res.json();
    expect(Object.keys(next).sort()).toEqual(["id", "index", "statement"]);
  });
});
