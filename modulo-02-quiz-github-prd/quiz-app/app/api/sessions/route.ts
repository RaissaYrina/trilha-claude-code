import { nanoid } from "nanoid";
import { z } from "zod";
import { routing } from "@/i18n/routing";
import { hashIp, parseBody, withErrors } from "@/lib/api";
import { createSession } from "@/lib/db/sessions";
import { LEVELS } from "@/lib/levels";
import { getLevelQuestions } from "@/lib/questions/loader";
import { pickQuestions } from "@/lib/questions/picker";
import { publicQuestionAt, type CreatedSession } from "@/lib/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  level: z.enum(LEVELS),
  locale: z.enum(routing.locales),
});

/** Cria uma partida: sorteia as perguntas e entrega a primeira, sem gabarito. */
export const POST = withErrors(async (req: Request) => {
  const body = await parseBody(req, bodySchema);
  if (body.error) return body.error;
  const { level, locale } = body.data;

  const picked = pickQuestions(getLevelQuestions(level));
  const session = await createSession({
    share_id: nanoid(10),
    level,
    locale,
    question_ids: picked.map((q) => q.id),
    current_served_at: new Date().toISOString(),
    ip_hash: hashIp(req),
  });

  return Response.json(
    {
      sessionId: session.id,
      total: session.question_ids.length,
      question: publicQuestionAt(session, 0, locale),
    } satisfies CreatedSession,
    { status: 201 },
  );
});
