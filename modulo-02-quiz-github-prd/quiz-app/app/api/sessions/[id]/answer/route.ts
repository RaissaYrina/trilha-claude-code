import { z } from "zod";
import { routing } from "@/i18n/routing";
import { jsonError, parseBody, uuidSchema, withErrors } from "@/lib/api";
import {
  advanceSession,
  findSession,
  insertAnswer,
  markExpired,
} from "@/lib/db/sessions";
import {
  applyAnswer,
  isExpired,
  pickLocale,
  publicQuestionAt,
} from "@/lib/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  index: z.int().min(0),
  answer: z.boolean(),
  locale: z.enum(routing.locales).optional(),
});

const alreadyAnswered = () =>
  jsonError("ALREADY_ANSWERED", "Esta pergunta já foi respondida.", 409);

/**
 * Registra a resposta da pergunta atual. Tempo e pontos são calculados aqui;
 * só depois desta chamada o cliente recebe o gabarito, a explicação e a doc.
 */
export const POST = withErrors(
  async (req: Request, ctx: RouteContext<"/api/sessions/[id]/answer">) => {
    const { id } = await ctx.params;
    if (!uuidSchema.safeParse(id).success) {
      return jsonError("SESSION_NOT_FOUND", "Sessão não encontrada.", 404);
    }
    const body = await parseBody(req, bodySchema);
    if (body.error) return body.error;

    const row = await findSession(id);
    if (!row)
      return jsonError("SESSION_NOT_FOUND", "Sessão não encontrada.", 404);

    const now = new Date();
    if (row.status === "expired" || isExpired(row, now)) {
      if (row.status === "in_progress") await markExpired(row.id);
      return jsonError("SESSION_EXPIRED", "A sessão expirou.", 410);
    }

    const { index, answer } = body.data;
    if (index >= row.question_ids.length) {
      return jsonError("INVALID_INDEX", "Índice de pergunta inválido.", 400);
    }
    if (row.status === "completed" || index < row.current_index) {
      return alreadyAnswered();
    }
    if (index > row.current_index) {
      return jsonError(
        "INVALID_INDEX",
        "Responda a pergunta atual primeiro.",
        400,
      );
    }

    const outcome = applyAnswer(row, answer, now);
    // A PK (session_id, position) é a primeira barreira contra respostas
    // simultâneas; o update condicionado ao índice é a segunda.
    if ((await insertAnswer(outcome.answer)) === "duplicate") {
      return alreadyAnswered();
    }
    if (!(await advanceSession(row.id, index, outcome.update))) {
      return alreadyAnswered();
    }

    const locale = pickLocale(body.data.locale, row);
    const { question, update } = outcome;
    return Response.json({
      correct: outcome.correct,
      correctAnswer: question.answer,
      explanation: question.explanation[locale],
      docUrl: question.docUrl,
      points: outcome.points,
      bonus: outcome.bonus,
      score: update.score,
      streak: update.streak,
      timeMs: outcome.timeMs,
      next: outcome.completed
        ? null
        : publicQuestionAt(row, update.current_index, locale),
      completed: outcome.completed,
    });
  },
);
