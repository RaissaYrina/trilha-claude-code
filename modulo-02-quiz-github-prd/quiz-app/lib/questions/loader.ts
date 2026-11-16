import "server-only";
import advanced from "@/content/questions/advanced.json";
import beginner from "@/content/questions/beginner.json";
import intermediate from "@/content/questions/intermediate.json";
import type { Locale } from "@/i18n/routing";
import type { Level } from "@/lib/levels";
import { questionFileSchema, type Question } from "./schema";

/** Pergunta como vai para o cliente: sem gabarito, explicação nem link da doc. */
export type PublicQuestion = {
  index: number;
  id: string;
  statement: string;
};

// Os JSONs são importados estaticamente para entrar no bundle do servidor, e
// validados no carregamento do módulo: um arquivo inválido quebra o build.
const BY_LEVEL: Record<Level, readonly Question[]> = {
  beginner: questionFileSchema("beginner").parse(beginner),
  intermediate: questionFileSchema("intermediate").parse(intermediate),
  advanced: questionFileSchema("advanced").parse(advanced),
};

const BY_ID = new Map(
  Object.values(BY_LEVEL)
    .flat()
    .map((q) => [q.id, q]),
);

export function getLevelQuestions(level: Level): readonly Question[] {
  return BY_LEVEL[level];
}

export function getQuestion(id: string): Question | undefined {
  return BY_ID.get(id);
}

export function toPublicQuestion(
  question: Question,
  index: number,
  locale: Locale,
): PublicQuestion {
  return { index, id: question.id, statement: question.statement[locale] };
}
