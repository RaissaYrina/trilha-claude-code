import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";

export type ErrorCode =
  | "INVALID_BODY"
  | "INVALID_INDEX"
  | "SESSION_NOT_FOUND"
  | "SESSION_EXPIRED"
  | "ALREADY_ANSWERED"
  | "ALREADY_SUBMITTED"
  | "INVALID_NICKNAME"
  | "INVALID_QUERY"
  | "SESSION_NOT_COMPLETED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

/** Resposta de erro no formato `{ error: { code, message } }` (PRD §6.5). */
export function jsonError(
  code: ErrorCode,
  message: string,
  status: number,
  headers?: HeadersInit,
) {
  return Response.json({ error: { code, message } }, { status, headers });
}

/** 429 com `Retry-After`, para quando o IP passou do limite da janela. */
export function rateLimited(retryAfterSeconds: number) {
  return jsonError(
    "RATE_LIMITED",
    "Muitas requisições. Tente novamente em alguns minutos.",
    429,
    { "Retry-After": String(retryAfterSeconds) },
  );
}

type Parsed<T> = { data: T; error?: never } | { data?: never; error: Response };

/** Lê o corpo JSON e valida com Zod; em caso de falha devolve um 400 pronto. */
export async function parseBody<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<Parsed<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: jsonError("INVALID_BODY", "Corpo JSON inválido.", 400) };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues
      .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
      .join("; ");
    return { error: jsonError("INVALID_BODY", message, 400) };
  }
  return { data: result.data };
}

/** Hash SHA-256 (com salt) do IP do cliente; o IP em si nunca é guardado. */
export function hashIp(req: Request): string {
  const salt = process.env.IP_HASH_SALT;
  if (!salt) throw new Error("Variável de ambiente IP_HASH_SALT ausente.");
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/** Envolve um handler: erros inesperados viram 500 sem vazar detalhes. */
export function withErrors<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error(error);
      return jsonError("INTERNAL_ERROR", "Erro interno.", 500);
    }
  };
}

export const uuidSchema = z.uuid();
