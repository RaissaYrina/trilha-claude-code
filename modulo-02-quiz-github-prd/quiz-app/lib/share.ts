/** Regras puras do compartilhamento de resultado (PRD RF07). */
import type { Locale } from "@/i18n/routing";
import type { Level } from "@/lib/levels";
import { classify, maxScore, type Band } from "@/lib/scoring";

/** Formato do share_id (nanoid de 10). */
export const SHARE_ID = /^[A-Za-z0-9_-]{10}$/;

/** Endereço público do site, sem barra no fim. */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  // Preview da Vercel sem a variável: usa a URL do próprio deploy.
  const vercel = process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}

export function sharePath(locale: Locale, shareId: string): string {
  return `/${locale}/r/${shareId}`;
}

/**
 * Resumo público da partida: o que a página `/r/[shareId]` e a OG image
 * mostram. Não tem perguntas nem respostas, então não revela o gabarito.
 */
export type ShareSummary = {
  shareId: string;
  level: Level;
  nickname: string | null;
  score: number;
  maxScore: number;
  correct: number;
  total: number;
  totalTimeMs: number;
  band: Band;
};

export function toShareSummary(
  row: {
    share_id: string;
    level: Level;
    score: number;
    correct_count: number;
    total_time_ms: number;
    question_ids: readonly string[];
  },
  nickname: string | null,
): ShareSummary {
  const total = row.question_ids.length;
  return {
    shareId: row.share_id,
    level: row.level,
    nickname,
    score: row.score,
    maxScore: maxScore(row.level),
    correct: row.correct_count,
    total,
    totalTimeMs: row.total_time_ms,
    band: classify(row.correct_count, total),
  };
}

export type ShareLinks = { linkedin: string; x: string; whatsapp: string };

/** Links de compartilhamento das redes, com o texto e a URL codificados. */
export function shareLinks(url: string, text: string): ShareLinks {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return {
    // O LinkedIn ignora o texto: o preview vem das OG tags da página.
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    x: `https://x.com/intent/post?text=${t}&url=${u}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  };
}
