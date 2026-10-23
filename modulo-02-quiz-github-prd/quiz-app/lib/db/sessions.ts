import "server-only";
import { getSupabase } from "@/lib/supabase/server";
import type { AnswerRow, SessionRow, SessionUpdate } from "@/lib/session";

const SESSION_COLUMNS =
  "id, share_id, level, locale, question_ids, current_index, current_served_at, score, correct_count, streak, max_streak, total_time_ms, status, created_at, completed_at";

/** Código do Postgres para violação de unique/PK. */
const UNIQUE_VIOLATION = "23505";

export type NewSession = Pick<
  SessionRow,
  "share_id" | "level" | "locale" | "question_ids" | "current_served_at"
> & { ip_hash: string };

export async function createSession(input: NewSession): Promise<SessionRow> {
  const { data, error } = await getSupabase()
    .from("quiz_sessions")
    .insert(input)
    .select(SESSION_COLUMNS)
    .single();
  if (error) throw error;
  return data as SessionRow;
}

export async function findSession(id: string): Promise<SessionRow | null> {
  const { data, error } = await getSupabase()
    .from("quiz_sessions")
    .select(SESSION_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as SessionRow | null;
}

export async function markExpired(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("quiz_sessions")
    .update({ status: "expired" })
    .eq("id", id)
    .eq("status", "in_progress");
  if (error) throw error;
}

/**
 * Grava `current_served_at` só se ainda estiver nulo para a posição atual, para
 * que recarregar a página não zere o cronômetro. Devolve o valor em vigor.
 */
export async function markServed(
  row: SessionRow,
  servedAt: string,
): Promise<string> {
  const { data, error } = await getSupabase()
    .from("quiz_sessions")
    .update({ current_served_at: servedAt })
    .eq("id", row.id)
    .eq("current_index", row.current_index)
    .is("current_served_at", null)
    .select("current_served_at");
  if (error) throw error;
  if (data.length > 0) return servedAt;
  const fresh = await findSession(row.id);
  return fresh?.current_served_at ?? servedAt;
}

/** Insere a resposta; a PK (session_id, position) barra respostas duplicadas. */
export async function insertAnswer(
  answer: AnswerRow,
): Promise<"ok" | "duplicate"> {
  const { error } = await getSupabase().from("session_answers").insert(answer);
  if (error?.code === UNIQUE_VIOLATION) return "duplicate";
  if (error) throw error;
  return "ok";
}

/**
 * Avança a sessão com controle otimista: só atualiza se ela ainda estiver na
 * posição respondida. Devolve false se outra requisição chegou antes.
 */
export async function advanceSession(
  id: string,
  expectedIndex: number,
  update: SessionUpdate,
): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("quiz_sessions")
    .update(update)
    .eq("id", id)
    .eq("current_index", expectedIndex)
    .eq("status", "in_progress")
    .select("id");
  if (error) throw error;
  return data.length > 0;
}

export async function listAnswers(sessionId: string): Promise<AnswerRow[]> {
  const { data, error } = await getSupabase()
    .from("session_answers")
    .select(
      "session_id, question_id, position, user_answer, is_correct, time_ms, points",
    )
    .eq("session_id", sessionId)
    .order("position");
  if (error) throw error;
  return data as AnswerRow[];
}
