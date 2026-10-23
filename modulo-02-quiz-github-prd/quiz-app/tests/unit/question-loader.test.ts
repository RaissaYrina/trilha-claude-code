import { describe, expect, it, vi } from "vitest";
import type { Question } from "@/lib/questions/schema";

const question = (id: string, level: Question["level"]): Question => ({
  id,
  level,
  topic: "fundamentos",
  roles: ["engineer"],
  dataScenario: false,
  answer: false,
  statement: { pt: `Afirmação ${id}`, en: `Statement ${id}` },
  explanation: { pt: "Explicação.", en: "Explanation." },
  docUrl: "https://code.claude.com/docs/en/overview",
});

vi.mock("@/content/questions/beginner.json", () => ({
  default: [question("beg-001", "beginner"), question("beg-002", "beginner")],
}));
vi.mock("@/content/questions/intermediate.json", () => ({
  default: [question("int-001", "intermediate")],
}));
vi.mock("@/content/questions/advanced.json", () => ({ default: [] }));

const { getLevelQuestions, getQuestion, toPublicQuestion } =
  await import("@/lib/questions/loader");

describe("loader de perguntas", () => {
  it("devolve as perguntas do nível", () => {
    expect(getLevelQuestions("beginner").map((q) => q.id)).toEqual([
      "beg-001",
      "beg-002",
    ]);
    expect(getLevelQuestions("advanced")).toEqual([]);
  });

  it("busca por id entre todos os níveis", () => {
    expect(getQuestion("int-001")?.level).toBe("intermediate");
    expect(getQuestion("adv-999")).toBeUndefined();
  });

  it("a pergunta pública não expõe gabarito, explicação nem docUrl", () => {
    const q = getQuestion("beg-002")!;
    const pub = toPublicQuestion(q, 4, "en");

    expect(pub).toEqual({
      index: 4,
      id: "beg-002",
      statement: "Statement beg-002",
    });
    expect(Object.keys(pub).sort()).toEqual(["id", "index", "statement"]);
  });
});
