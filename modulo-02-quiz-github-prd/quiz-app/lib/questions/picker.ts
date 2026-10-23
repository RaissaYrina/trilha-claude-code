import { randomInt as cryptoRandomInt } from "node:crypto";
import { QUESTIONS_PER_SESSION } from "@/lib/levels";
import type { Question } from "./schema";

/** Inteiro uniforme em [0, max). */
export type RandomInt = (max: number) => number;

/** Faixa desejável de respostas "Verdadeiro" numa partida (PRD §6.6). */
export const TRUE_RANGE = { min: 5, max: 10 } as const;
const MAX_ATTEMPTS = 20;

/** Embaralhamento Fisher-Yates; não altera o array de entrada. */
export function shuffle<T>(items: readonly T[], randomInt: RandomInt): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Sorteia `count` perguntas sem repetição. Re-sorteia até 20 vezes para que a
 * partida tenha entre 5 e 10 respostas verdadeiras; se não conseguir, fica com
 * o último sorteio, já que a faixa é desejável, não obrigatória.
 */
export function pickQuestions(
  questions: readonly Question[],
  {
    count = QUESTIONS_PER_SESSION,
    randomInt = cryptoRandomInt,
  }: { count?: number; randomInt?: RandomInt } = {},
): Question[] {
  if (questions.length < count) {
    throw new Error(
      `São necessárias ${count} perguntas, mas o nível tem ${questions.length}.`,
    );
  }

  let picked: Question[] = [];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    picked = shuffle(questions, randomInt).slice(0, count);
    const trues = picked.filter((q) => q.answer).length;
    if (trues >= TRUE_RANGE.min && trues <= TRUE_RANGE.max) break;
  }
  return picked;
}
