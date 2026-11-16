import { describe, expect, it } from "vitest";
import {
  questionFileSchema,
  questionSchema,
  type Question,
} from "@/lib/questions/schema";

const valid: Question = {
  id: "beg-001",
  level: "beginner",
  topic: "fundamentos",
  roles: ["analyst"],
  dataScenario: true,
  answer: true,
  statement: { pt: "Afirmação.", en: "Statement." },
  explanation: { pt: "Explicação.", en: "Explanation." },
  docUrl: "https://code.claude.com/docs/en/overview",
};

describe("questionSchema", () => {
  it("aceita uma pergunta válida", () => {
    expect(questionSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ["sem tradução en", { statement: { pt: "Afirmação.", en: " " } }],
    ["roles vazio", { roles: [] }],
    ["role desconhecida", { roles: ["manager"] }],
    ["docUrl http", { docUrl: "http://code.claude.com/docs/en/overview" }],
    ["enunciado > 200", { statement: { pt: "a".repeat(201), en: "b" } }],
    ["explicação > 400", { explanation: { pt: "a", en: "b".repeat(401) } }],
    ["id fora do padrão", { id: "beginner-1" }],
    ["sem dataScenario", { dataScenario: undefined }],
  ])("rejeita %s", (_, patch) => {
    expect(questionSchema.safeParse({ ...valid, ...patch }).success).toBe(
      false,
    );
  });
});

describe("questionFileSchema", () => {
  const schema = questionFileSchema("beginner");

  it("aceita perguntas do nível com ids únicos", () => {
    const second = { ...valid, id: "beg-002" };
    expect(schema.safeParse([valid, second]).success).toBe(true);
  });

  it("rejeita id duplicado", () => {
    const result = schema.safeParse([valid, { ...valid }]);
    expect(result.error?.issues[0]?.message).toMatch(/duplicado/);
  });

  it("rejeita level diferente do arquivo", () => {
    const result = schema.safeParse([{ ...valid, level: "advanced" }]);
    expect(result.error?.issues[0]?.path).toEqual([0, "level"]);
  });

  it("rejeita prefixo de id de outro nível", () => {
    const result = schema.safeParse([{ ...valid, id: "adv-001" }]);
    expect(result.error?.issues[0]?.path).toEqual([0, "id"]);
  });
});
