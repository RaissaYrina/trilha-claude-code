import { randomUUID } from "node:crypto";
import type * as LeaderboardDb from "@/lib/db/leaderboard";
import type { NewEntry } from "@/lib/db/leaderboard";
import type * as RateLimitsDb from "@/lib/db/rate-limits";
import type * as Db from "@/lib/db/sessions";
import type { EntryRow } from "@/lib/leaderboard";
import type { AnswerRow, SessionRow } from "@/lib/session";

type StoredEntry = NewEntry & EntryRow;

/** Mesma ordem do índice do ranking: score desc, tempo asc, data asc. */
function byRanking(a: StoredEntry, b: StoredEntry): number {
  return (
    b.score - a.score ||
    a.total_time_ms - b.total_time_ms ||
    Date.parse(a.created_at) - Date.parse(b.created_at)
  );
}

function toRow({
  nickname,
  score,
  correct_count,
  total_time_ms,
  created_at,
}: StoredEntry): EntryRow {
  return { nickname, score, correct_count, total_time_ms, created_at };
}

/**
 * Versão em memória de `lib/db/`, com as mesmas garantias do banco: PK
 * (session_id, position) nas respostas, update condicionado ao índice, unique
 * em `leaderboard_entries.session_id` e contagem atômica do rate limit.
 */
export function createFakeDb() {
  const sessions = new Map<string, SessionRow>();
  const answers: AnswerRow[] = [];
  const entries: StoredEntry[] = [];
  const rateLimits = new Map<string, number>();

  const leaderboard: typeof LeaderboardDb = {
    async insertEntry(entry) {
      if (entries.some((e) => e.session_id === entry.session_id)) {
        return "duplicate";
      }
      entries.push({ ...entry, created_at: new Date().toISOString() });
      return "ok";
    },
    async hasEntry(sessionId) {
      return entries.some((e) => e.session_id === sessionId);
    },
    async listTop(level, since, limit) {
      return entries
        .filter((e) => e.level === level && (!since || e.created_at >= since))
        .sort(byRanking)
        .slice(0, limit)
        .map(toRow);
    },
    async findPosition(shareId, level, since) {
      const session = [...sessions.values()].find(
        (s) => s.share_id === shareId,
      );
      const ranked = entries
        .filter((e) => e.level === level && (!since || e.created_at >= since))
        .sort(byRanking);
      const index = ranked.findIndex((e) => e.session_id === session?.id);
      return index < 0 ? null : { ...toRow(ranked[index]), rank: index + 1 };
    },
  };

  const limits: typeof RateLimitsDb = {
    async hitRateLimit(key) {
      const count = (rateLimits.get(key) ?? 0) + 1;
      rateLimits.set(key, count);
      return count;
    },
  };

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

  return {
    api,
    leaderboard,
    limits,
    sessions,
    answers,
    entries,
    rateLimits,
  };
}
