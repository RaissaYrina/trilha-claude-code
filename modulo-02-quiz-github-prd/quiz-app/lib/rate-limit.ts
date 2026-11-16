import "server-only";
import { hitRateLimit } from "@/lib/db/rate-limits";

export type RateLimitRule = {
  scope: string;
  limit: number;
  windowMs: number;
};

const TEN_MINUTES_MS = 10 * 60 * 1000;

/** Limites por IP (PRD §6.5), em janela fixa. */
export const RATE_LIMITS = {
  session: { scope: "session", limit: 10, windowMs: TEN_MINUTES_MS },
  leaderboard: { scope: "leaderboard", limit: 5, windowMs: TEN_MINUTES_MS },
} as const satisfies Record<string, RateLimitRule>;

/** Janela fixa que contém `now`: chave no banco e instante em que ela vence. */
export function rateLimitWindow(
  rule: RateLimitRule,
  ipHash: string,
  now: Date,
) {
  const start = Math.floor(now.getTime() / rule.windowMs) * rule.windowMs;
  const end = start + rule.windowMs;
  return { key: `${rule.scope}:${ipHash}:${start}`, expiresAt: new Date(end) };
}

export type RateLimitResult =
  { ok: true } | { ok: false; retryAfterSeconds: number };

/** Conta a requisição e diz se ela passou do limite da janela atual. */
export async function checkRateLimit(
  rule: RateLimitRule,
  ipHash: string,
  now = new Date(),
): Promise<RateLimitResult> {
  const { key, expiresAt } = rateLimitWindow(rule, ipHash, now);
  const count = await hitRateLimit(key, expiresAt.toISOString());
  if (count <= rule.limit) return { ok: true };
  return {
    ok: false,
    retryAfterSeconds: Math.ceil((expiresAt.getTime() - now.getTime()) / 1000),
  };
}
