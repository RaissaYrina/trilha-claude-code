import { z } from "zod";
import {
  hashIp,
  jsonError,
  parseBody,
  rateLimited,
  uuidSchema,
  withErrors,
} from "@/lib/api";
import { findPosition, insertEntry } from "@/lib/db/leaderboard";
import { findSession } from "@/lib/db/sessions";
import type { SubmittedEntry } from "@/lib/leaderboard";
import { validateNickname } from "@/lib/nickname";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({ nickname: z.string().max(100) });

const NICKNAME_MESSAGES = {
  length: "O apelido precisa ter de 3 a 20 caracteres.",
  chars: "Use só letras, números, espaço, _, - e ponto.",
  profanity: "Escolha outro apelido.",
} as const;

/**
 * Registra no ranking uma partida concluída. Pontuação, acertos e tempo vêm
 * da sessão no banco; o cliente só manda o apelido.
 */
export const POST = withErrors(
  async (req: Request, ctx: RouteContext<"/api/sessions/[id]/leaderboard">) => {
    const { id } = await ctx.params;
    if (!uuidSchema.safeParse(id).success) {
      return jsonError("SESSION_NOT_FOUND", "Sessão não encontrada.", 404);
    }
    const body = await parseBody(req, bodySchema);
    if (body.error) return body.error;

    const limit = await checkRateLimit(RATE_LIMITS.leaderboard, hashIp(req));
    if (!limit.ok) return rateLimited(limit.retryAfterSeconds);

    const row = await findSession(id);
    if (!row)
      return jsonError("SESSION_NOT_FOUND", "Sessão não encontrada.", 404);
    if (row.status !== "completed") {
      return jsonError(
        "SESSION_NOT_COMPLETED",
        "Só partidas concluídas entram no ranking.",
        403,
      );
    }

    const nickname = validateNickname(body.data.nickname);
    if (!nickname.ok) {
      return jsonError(
        "INVALID_NICKNAME",
        NICKNAME_MESSAGES[nickname.error],
        422,
      );
    }

    const inserted = await insertEntry({
      session_id: row.id,
      nickname: nickname.nickname,
      level: row.level,
      score: row.score,
      correct_count: row.correct_count,
      total_time_ms: row.total_time_ms,
    });
    if (inserted === "duplicate") {
      return jsonError(
        "ALREADY_SUBMITTED",
        "Esta partida já está no ranking.",
        409,
      );
    }

    const position = await findPosition(row.share_id, row.level, null);
    if (!position) throw new Error(`Entrada da sessão ${row.id} sumiu.`);
    return Response.json(
      { rank: position.rank, shareId: row.share_id } satisfies SubmittedEntry,
      { status: 201 },
    );
  },
);
