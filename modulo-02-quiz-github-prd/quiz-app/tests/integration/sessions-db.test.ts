import { afterAll, describe, expect, it } from "vitest";
import {
  advanceSession,
  createSession,
  findSession,
  insertAnswer,
  listAnswers,
  markExpired,
  markServed,
} from "@/lib/db/sessions";
import { getLevelQuestions } from "@/lib/questions/loader";
import { applyAnswer } from "@/lib/session";
import { getSupabase } from "@/lib/supabase/server";

const created: string[] = [];

async function newSession(servedAt: string | null = new Date().toISOString()) {
  const row = await createSession({
    share_id: `it${Math.random().toString(36).slice(2, 10)}`,
    level: "beginner",
    locale: "pt",
    question_ids: getLevelQuestions("beginner")
      .slice(0, 15)
      .map((q) => q.id),
    current_served_at: servedAt,
    ip_hash: "integration-test",
  });
  created.push(row.id);
  return row;
}

afterAll(async () => {
  if (created.length > 0) {
    await getSupabase().from("quiz_sessions").delete().in("id", created);
  }
});

describe("lib/db/sessions contra o Postgres local", () => {
  it("cria e lê a sessão com os defaults do banco", async () => {
    const row = await newSession();
    expect(row).toMatchObject({
      current_index: 0,
      score: 0,
      streak: 0,
      status: "in_progress",
    });
    expect(await findSession(row.id)).toEqual(row);
    expect(await findSession(crypto.randomUUID())).toBeNull();
  });

  it("markServed só grava quando o valor está nulo", async () => {
    const row = await newSession(null);
    const first = "2026-10-22T12:00:00.000Z";

    expect(await markServed(row, first)).toBe(first);
    const again = await markServed(row, "2026-10-22T12:05:00.000Z");
    expect(Date.parse(again)).toBe(Date.parse(first));
  });

  it("a PK barra a segunda resposta da mesma posição", async () => {
    const row = await newSession();
    const { answer } = applyAnswer(row, true, new Date());

    expect(await insertAnswer(answer)).toBe("ok");
    expect(await insertAnswer(answer)).toBe("duplicate");
    expect(await listAnswers(row.id)).toHaveLength(1);
  });

  it("advanceSession só avança a partir do índice esperado", async () => {
    const row = await newSession();
    const { update } = applyAnswer(row, true, new Date());

    expect(await advanceSession(row.id, 0, update)).toBe(true);
    expect(await advanceSession(row.id, 0, update)).toBe(false);
    expect((await findSession(row.id))?.current_index).toBe(1);
  });

  it("markExpired muda só sessões em andamento", async () => {
    const row = await newSession();
    await markExpired(row.id);
    expect((await findSession(row.id))?.status).toBe("expired");
  });
});
