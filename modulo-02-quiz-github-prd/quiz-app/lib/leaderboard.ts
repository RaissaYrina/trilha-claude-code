/** Tipos e regras puras do ranking, usados pela API, pela página e pelo cliente. */

export const PERIODS = ["all", "7d"] as const;
export type Period = (typeof PERIODS)[number];

export function isPeriod(value: string): value is Period {
  return (PERIODS as readonly string[]).includes(value);
}

/** Tamanho do top exibido por nível. */
export const LEADERBOARD_LIMIT = 50;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Início do período em ISO, ou null para "Sempre". */
export function periodStart(period: Period, now: Date): string | null {
  return period === "7d"
    ? new Date(now.getTime() - SEVEN_DAYS_MS).toISOString()
    : null;
}

export type EntryRow = {
  nickname: string;
  score: number;
  correct_count: number;
  total_time_ms: number;
  created_at: string;
};

/** Linha pública do ranking (PRD §6.5). */
export type LeaderboardEntry = {
  rank: number;
  nickname: string;
  score: number;
  correct: number;
  timeMs: number;
  createdAt: string;
};

export function toEntry(row: EntryRow, rank: number): LeaderboardEntry {
  return {
    rank,
    nickname: row.nickname,
    score: row.score,
    correct: row.correct_count,
    timeMs: row.total_time_ms,
    createdAt: row.created_at,
  };
}

/** As linhas já vêm ordenadas do banco; a posição é o índice + 1. */
export function toEntries(rows: readonly EntryRow[]): LeaderboardEntry[] {
  return rows.map((row, i) => toEntry(row, i + 1));
}

/** Corpo de `POST /api/sessions/:id/leaderboard` (201). */
export type SubmittedEntry = { rank: number; shareId: string };
