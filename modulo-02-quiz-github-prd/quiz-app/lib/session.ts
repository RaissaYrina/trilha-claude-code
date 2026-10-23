import "server-only";
import { routing, type Locale } from "@/i18n/routing";
import type { Level } from "@/lib/levels";
import {
  getQuestion,
  toPublicQuestion,
  type PublicQuestion,
} from "@/lib/questions/loader";
import type { Question } from "@/lib/questions/schema";
import { calculateScore, classify, maxScore, type Band } from "@/lib/scoring";

/** Uma sessão expira após 60 min sem atividade. */
export const SESSION_TTL_MS = 60 * 60 * 1000;

export type SessionStatus = "in_progress" | "completed" | "expired";

export type SessionRow = {
  id: string;
  share_id: string;
  level: Level;
  locale: Locale;
  question_ids: string[];
  current_index: number;
  current_served_at: string | null;
  score: number;
  correct_count: number;
  streak: number;
  max_streak: number;
  total_time_ms: number;
  status: SessionStatus;
  created_at: string;
  completed_at: string | null;
};

export type AnswerRow = {
  session_id: string;
  question_id: string;
  position: number;
  user_answer: boolean;
  is_correct: boolean;
  time_ms: number;
  points: number;
};

export type SessionUpdate = Pick<
  SessionRow,
  | "current_index"
  | "current_served_at"
  | "score"
  | "correct_count"
  | "streak"
  | "max_streak"
  | "total_time_ms"
  | "status"
  | "completed_at"
>;

/**
 * Última atividade da sessão. `current_served_at` é gravado na criação e a
 * cada resposta (quando a próxima pergunta é entregue), então ele já é
 * max(created_at, último answered_at).
 */
function lastActivity(row: SessionRow): number {
  return Date.parse(row.current_served_at ?? row.created_at);
}

export function isExpired(row: SessionRow, now: Date): boolean {
  return (
    row.status === "in_progress" &&
    now.getTime() - lastActivity(row) > SESSION_TTL_MS
  );
}

/** Locale pedido pelo cliente, se válido; senão o da sessão. */
export function pickLocale(
  requested: string | null | undefined,
  row: SessionRow,
): Locale {
  return routing.locales.find((l) => l === requested) ?? row.locale;
}

function questionAt(row: SessionRow, index: number): Question {
  const question = getQuestion(row.question_ids[index]);
  if (!question) {
    throw new Error(`Pergunta ${row.question_ids[index]} não existe no banco.`);
  }
  return question;
}

export function publicQuestionAt(
  row: SessionRow,
  index: number,
  locale: Locale,
): PublicQuestion {
  return toPublicQuestion(questionAt(row, index), index, locale);
}

export type AnswerOutcome = {
  correct: boolean;
  question: Question;
  timeMs: number;
  points: number;
  bonus: number;
  completed: boolean;
  answer: AnswerRow;
  update: SessionUpdate;
};

/**
 * Aplica a resposta à pergunta atual: calcula tempo e pontos no servidor e
 * monta a linha de `session_answers` e o novo estado da sessão.
 */
export function applyAnswer(
  row: SessionRow,
  userAnswer: boolean,
  now: Date,
): AnswerOutcome {
  const index = row.current_index;
  const question = questionAt(row, index);
  const correct = userAnswer === question.answer;
  const timeMs = Math.max(0, now.getTime() - lastActivity(row));
  const score = calculateScore({
    level: row.level,
    correct,
    timeMs,
    streakBefore: row.streak,
  });
  const nextIndex = index + 1;
  const completed = nextIndex >= row.question_ids.length;

  return {
    correct,
    question,
    timeMs,
    points: score.points,
    bonus: score.bonus,
    completed,
    answer: {
      session_id: row.id,
      question_id: question.id,
      position: index,
      user_answer: userAnswer,
      is_correct: correct,
      time_ms: timeMs,
      points: score.points,
    },
    update: {
      current_index: nextIndex,
      // A próxima pergunta é entregue na própria resposta, então o cronômetro dela começa agora.
      current_served_at: completed ? null : now.toISOString(),
      score: row.score + score.points,
      correct_count: row.correct_count + (correct ? 1 : 0),
      streak: score.streakAfter,
      max_streak: Math.max(row.max_streak, score.streakAfter),
      total_time_ms: row.total_time_ms + timeMs,
      status: completed ? "completed" : "in_progress",
      completed_at: completed ? now.toISOString() : null,
    },
  };
}

/** Corpo de `POST /api/sessions/:id/answer` (PRD §6.5, mais `bonus`). */
export type AnswerResponse = {
  correct: boolean;
  correctAnswer: boolean;
  explanation: string;
  docUrl: string;
  points: number;
  bonus: number;
  score: number;
  streak: number;
  timeMs: number;
  next: PublicQuestion | null;
  completed: boolean;
};

/** Corpo de `POST /api/sessions` (201). */
export type CreatedSession = {
  sessionId: string;
  total: number;
  question: PublicQuestion;
};

export type InProgressState = {
  status: "in_progress";
  level: Level;
  index: number;
  total: number;
  score: number;
  streak: number;
  correctCount: number;
  question: PublicQuestion;
};

export function toInProgressState(
  row: SessionRow,
  locale: Locale,
): InProgressState {
  return {
    status: "in_progress",
    level: row.level,
    index: row.current_index,
    total: row.question_ids.length,
    score: row.score,
    streak: row.streak,
    correctCount: row.correct_count,
    question: publicQuestionAt(row, row.current_index, locale),
  };
}

export type ReviewItem = {
  index: number;
  id: string;
  statement: string;
  userAnswer: boolean;
  correct: boolean;
  correctAnswer: boolean;
  explanation: string;
  docUrl: string;
  points: number;
  timeMs: number;
};

export type CompletedState = {
  status: "completed";
  level: Level;
  shareId: string;
  total: number;
  score: number;
  maxScore: number;
  correctCount: number;
  maxStreak: number;
  totalTimeMs: number;
  band: Band;
  review: ReviewItem[];
};

/** Resumo da partida concluída. Só aqui o gabarito de todas as perguntas é revelado. */
export function toCompletedState(
  row: SessionRow,
  answers: readonly AnswerRow[],
  locale: Locale,
): CompletedState {
  const total = row.question_ids.length;
  const review = [...answers]
    .sort((a, b) => a.position - b.position)
    .map((a): ReviewItem => {
      const question = questionAt(row, a.position);
      return {
        index: a.position,
        id: question.id,
        statement: question.statement[locale],
        userAnswer: a.user_answer,
        correct: a.is_correct,
        correctAnswer: question.answer,
        explanation: question.explanation[locale],
        docUrl: question.docUrl,
        points: a.points,
        timeMs: a.time_ms,
      };
    });

  return {
    status: "completed",
    level: row.level,
    shareId: row.share_id,
    total,
    score: row.score,
    maxScore: maxScore(row.level),
    correctCount: row.correct_count,
    maxStreak: row.max_streak,
    totalTimeMs: row.total_time_ms,
    band: classify(row.correct_count, total),
    review,
  };
}
