import { jsonError, uuidSchema, withErrors } from "@/lib/api";
import {
  findSession,
  listAnswers,
  markExpired,
  markServed,
} from "@/lib/db/sessions";
import {
  isExpired,
  pickLocale,
  toCompletedState,
  toInProgressState,
} from "@/lib/session";

export const runtime = "nodejs";

/**
 * Estado da partida, para retomá-la. Em andamento: só a pergunta atual, sem
 * gabarito. Concluída: resumo com a revisão completa.
 */
export const GET = withErrors(
  async (req: Request, ctx: RouteContext<"/api/sessions/[id]">) => {
    const { id } = await ctx.params;
    if (!uuidSchema.safeParse(id).success) {
      return jsonError("SESSION_NOT_FOUND", "Sessão não encontrada.", 404);
    }

    const row = await findSession(id);
    if (!row)
      return jsonError("SESSION_NOT_FOUND", "Sessão não encontrada.", 404);

    const now = new Date();
    if (row.status === "expired" || isExpired(row, now)) {
      if (row.status === "in_progress") await markExpired(row.id);
      return jsonError("SESSION_EXPIRED", "A sessão expirou.", 410);
    }

    const locale = pickLocale(new URL(req.url).searchParams.get("locale"), row);

    if (row.status === "completed") {
      const answers = await listAnswers(row.id);
      return Response.json(toCompletedState(row, answers, locale));
    }

    if (row.current_served_at === null) {
      row.current_served_at = await markServed(row, now.toISOString());
    }
    return Response.json(toInProgressState(row, locale));
  },
);
