import { randomUUID } from "node:crypto";
import type * as Db from "@/lib/db/sessions";
import type { AnswerRow, SessionRow } from "@/lib/session";

/**
 * Versão em memória de `lib/db/sessions.ts`, com as mesmas garantias do banco:
 * PK (session_id, position) nas respostas e update condicionado ao índice.
 */
export function createFakeDb() {
  const sessions = new Map<string, SessionRow>();
  const answers: AnswerRow[] = [];

  const api: typeof Db = {
    async createSession(input) {
      const row: SessionRow = {
        id: randomUUID(),
        share_id: input.share_id,
        level: input.level,
        locale: input.locale,
        question_ids: input.question_ids,
        current_index: 0,
        current_served_at: input.current_served_at,
        score: 0,
        correct_count: 0,
        streak: 0,
        max_streak: 0,
        total_time_ms: 0,
        status: "in_progress",
        created_at: new Date().toISOString(),
        completed_at: null,
      };
      sessions.set(row.id, row);
      return { ...row };
    },
    async findSession(id) {
      const row = sessions.get(id);
      return row ? { ...row } : null;
    },
    async markExpired(id) {
      const row = sessions.get(id);
      if (row?.status === "in_progress") row.status = "expired";
    },
    async markServed(row, servedAt) {
      const stored = sessions.get(row.id)!;
      if (
        stored.current_index === row.current_index &&
        !stored.current_served_at
      ) {
        stored.current_served_at = servedAt;
      }
      return stored.current_served_at ?? servedAt;
    },
    async insertAnswer(answer) {
      const exists = answers.some(
        (a) =>
          a.session_id === answer.session_id && a.position === answer.position,
      );
      if (exists) return "duplicate";
      answers.push({ ...answer });
      return "ok";
    },
    async advanceSession(id, expectedIndex, update) {
      const row = sessions.get(id);
      if (
        !row ||
        row.current_index !== expectedIndex ||
        row.status !== "in_progress"
      ) {
        return false;
      }
      Object.assign(row, update);
      return true;
    },
    async listAnswers(sessionId) {
      return answers
        .filter((a) => a.session_id === sessionId)
        .sort((a, b) => a.position - b.position);
    },
  };

  return { api, sessions, answers };
}
