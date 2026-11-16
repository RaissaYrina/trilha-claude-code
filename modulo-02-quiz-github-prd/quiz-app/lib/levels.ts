export const LEVELS = ["beginner", "intermediate", "advanced"] as const;

export type Level = (typeof LEVELS)[number];

/** Quantidade de perguntas sorteadas por partida. */
export const QUESTIONS_PER_SESSION = 15;

export function isLevel(value: string): value is Level {
  return (LEVELS as readonly string[]).includes(value);
}
