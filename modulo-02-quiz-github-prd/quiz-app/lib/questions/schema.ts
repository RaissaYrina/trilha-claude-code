import { z } from "zod";
import { LEVELS, type Level } from "@/lib/levels";

export const ROLES = ["analyst", "engineer", "scientist"] as const;

export type Role = (typeof ROLES)[number];

const ID_PREFIX: Record<Level, string> = {
  beginner: "beg",
  intermediate: "int",
  advanced: "adv",
};

/** Texto obrigatório nos dois idiomas, com limite de caracteres. */
const localized = (max: number) =>
  z.object({
    pt: z.string().trim().min(1).max(max),
    en: z.string().trim().min(1).max(max),
  });

export const questionSchema = z.object({
  id: z.string().regex(/^(beg|int|adv)-\d{3}$/),
  level: z.enum(LEVELS),
  topic: z.string().trim().min(1),
  roles: z.array(z.enum(ROLES)).min(1),
  /** A pergunta usa um cenário de dados (SQL, dbt, notebooks...) como contexto. */
  dataScenario: z.boolean(),
  answer: z.boolean(),
  statement: localized(200),
  explanation: localized(400),
  docUrl: z.url({ protocol: /^https$/ }),
});

export type Question = z.infer<typeof questionSchema>;

/**
 * Schema de um arquivo `content/questions/{level}.json`: toda pergunta tem o
 * `level` do arquivo, o prefixo de id correspondente e um id único.
 */
export function questionFileSchema(level: Level) {
  return z.array(questionSchema).superRefine((questions, ctx) => {
    const seen = new Set<string>();
    questions.forEach((q, index) => {
      if (q.level !== level) {
        ctx.addIssue({
          code: "custom",
          path: [index, "level"],
          message: `level "${q.level}" diferente do arquivo (${level})`,
        });
      }
      if (!q.id.startsWith(`${ID_PREFIX[level]}-`)) {
        ctx.addIssue({
          code: "custom",
          path: [index, "id"],
          message: `id "${q.id}" deveria começar com "${ID_PREFIX[level]}-"`,
        });
      }
      if (seen.has(q.id)) {
        ctx.addIssue({
          code: "custom",
          path: [index, "id"],
          message: `id duplicado: ${q.id}`,
        });
      }
      seen.add(q.id);
    });
  });
}
