import { describe, expect, it } from "vitest";
import advanced from "@/content/questions/advanced.json";
import beginner from "@/content/questions/beginner.json";
import intermediate from "@/content/questions/intermediate.json";
import { LEVELS, type Level } from "@/lib/levels";
import {
  questionFileSchema,
  ROLES,
  type Question,
} from "@/lib/questions/schema";

const FILES: Record<Level, unknown> = { beginner, intermediate, advanced };

const parsed = Object.fromEntries(
  LEVELS.map((level) => [
    level,
    questionFileSchema(level).safeParse(FILES[level]),
  ]),
) as Record<
  Level,
  ReturnType<ReturnType<typeof questionFileSchema>["safeParse"]>
>;

const share = (questions: Question[], predicate: (q: Question) => boolean) =>
  questions.filter(predicate).length / questions.length;

describe.each(LEVELS)("banco de perguntas: %s", (level) => {
  it("segue o schema", () => {
    expect(parsed[level].error?.issues ?? []).toEqual([]);
  });

  // Os níveis entram um por vez durante o M2; os vazios ainda não são checados.
  const questions = parsed[level].data ?? [];
  const pending = questions.length === 0;

  it.skipIf(pending)("tem 30 perguntas", () => {
    expect(questions).toHaveLength(30);
  });

  it.skipIf(pending)("tem entre 40% e 60% de respostas verdadeiras", () => {
    const trueShare = share(questions, (q) => q.answer);
    expect(trueShare).toBeGreaterThanOrEqual(0.4);
    expect(trueShare).toBeLessThanOrEqual(0.6);
  });

  it.skipIf(pending).each(ROLES)("a função %s aparece em ≥ 30%%", (role) => {
    expect(
      share(questions, (q) => q.roles.includes(role)),
    ).toBeGreaterThanOrEqual(0.3);
  });

  it.skipIf(pending)("≥ 70% das perguntas usam um cenário de dados", () => {
    expect(share(questions, (q) => q.dataScenario)).toBeGreaterThanOrEqual(0.7);
  });
});

describe("banco de perguntas: todos os níveis", () => {
  it("ids são únicos entre os arquivos", () => {
    const ids = LEVELS.flatMap((level) => parsed[level].data ?? []).map(
      (q) => q.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});
