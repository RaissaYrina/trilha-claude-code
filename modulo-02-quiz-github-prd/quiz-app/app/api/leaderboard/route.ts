import { z } from "zod";
import { jsonError, withErrors } from "@/lib/api";
import { listTop } from "@/lib/db/leaderboard";
import {
  LEADERBOARD_LIMIT,
  PERIODS,
  periodStart,
  toEntries,
} from "@/lib/leaderboard";
import { LEVELS } from "@/lib/levels";

export const runtime = "nodejs";

const querySchema = z.object({
  level: z.enum(LEVELS),
  period: z.enum(PERIODS).default("all"),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(LEADERBOARD_LIMIT)
    .default(LEADERBOARD_LIMIT),
});

/**
 * Top do nível. A resposta depende da query, então o cache de 30s fica na CDN
 * (`s-maxage`), que separa as entradas por URL.
 */
export const GET = withErrors(async (req: Request) => {
  const params = new URL(req.url).searchParams;
  const query = querySchema.safeParse({
    level: params.get("level") ?? undefined,
    period: params.get("period") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
  if (!query.success) {
    return jsonError("INVALID_QUERY", "Parâmetros inválidos.", 400);
  }

  const { level, period, limit } = query.data;
  const rows = await listTop(level, periodStart(period, new Date()), limit);
  return Response.json(
    { entries: toEntries(rows) },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30",
      },
    },
  );
});
