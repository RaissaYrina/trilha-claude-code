import { QUESTIONS_PER_SESSION, type Level } from "./levels";

/** Pontos base por acerto, por nível (PRD RF04). */
export const BASE_POINTS: Readonly<Record<Level, number>> = {
  beginner: 100,
  intermediate: 150,
  advanced: 200,
};

/** Tempo, em segundos, a partir do qual o bônus de velocidade é zero. */
const BONUS_WINDOW_S = 20;
/** Multiplicador máximo do streak, em décimos (1,5). */
const MAX_MULTIPLIER_TENTHS = 15;

export type ScoreInput = {
  level: Level;
  correct: boolean;
  timeMs: number;
  /** Acertos consecutivos antes desta resposta. */
  streakBefore: number;
};

export type ScoreResult = {
  points: number;
  bonus: number;
  multiplier: number;
  streakAfter: number;
};

export type Band = "explorer" | "practitioner" | "specialist" | "master";

/**
 * Pontos de uma resposta:
 * - bônus = round(base × 0,5 × max(0, 1 − t/20)), com t em segundos;
 * - multiplicador = 1,0 no 1º acerto, +0,1 por acerto consecutivo, até 1,5;
 * - pontos = round((base + bônus) × multiplicador). Erro vale 0 e zera o streak.
 */
export function calculateScore({
  level,
  correct,
  timeMs,
  streakBefore,
}: ScoreInput): ScoreResult {
  if (!correct) return { points: 0, bonus: 0, multiplier: 1, streakAfter: 0 };

  const base = BASE_POINTS[level];
  const seconds = Math.max(0, timeMs) / 1000;
  const bonus = Math.round(
    base * 0.5 * Math.max(0, 1 - seconds / BONUS_WINDOW_S),
  );
  // Em décimos inteiros, para evitar erro de ponto flutuante (1 + 0,1 × 3 ≠ 1,3).
  const tenths = Math.min(
    MAX_MULTIPLIER_TENTHS,
    10 + Math.max(0, streakBefore),
  );
  const points = Math.round(((base + bonus) * tenths) / 10);

  return {
    points,
    bonus,
    multiplier: tenths / 10,
    streakAfter: streakBefore + 1,
  };
}

/** Pontuação máxima teórica do nível: todos os acertos, respondidos em t = 0. */
export function maxScore(level: Level): number {
  let total = 0;
  for (let streak = 0; streak < QUESTIONS_PER_SESSION; streak++) {
    total += calculateScore({
      level,
      correct: true,
      timeMs: 0,
      streakBefore: streak,
    }).points;
  }
  return total;
}

/** Faixa de classificação pelo percentual de acertos (0–40, 41–70, 71–90, 91–100). */
export function classify(correct: number, total: number): Band {
  const percent = total > 0 ? (correct / total) * 100 : 0;
  if (percent <= 40) return "explorer";
  if (percent <= 70) return "practitioner";
  if (percent <= 90) return "specialist";
  return "master";
}
