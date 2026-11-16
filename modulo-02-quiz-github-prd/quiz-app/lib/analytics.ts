import { track } from "@vercel/analytics";
import type { Locale } from "@/i18n/routing";
import type { Level } from "@/lib/levels";

export type ShareChannel = "native" | "linkedin" | "x" | "whatsapp" | "copy";

/** Eventos customizados (PRD RF10). Nenhum carrega dado pessoal. */
export type AnalyticsEvent =
  | { name: "quiz_started"; props: { level: Level; locale: Locale } }
  | {
      name: "quiz_completed";
      props: { level: Level; score: number; correct: number };
    }
  | { name: "leaderboard_submitted"; props: { level: Level } }
  | { name: "result_shared"; props: { channel: ShareChannel } };

/** `track` tipado. Falha de analytics nunca quebra a interface. */
export function trackEvent(event: AnalyticsEvent): void {
  try {
    track(event.name, event.props);
  } catch {
    // Bloqueador de anúncios ou script fora do ar: segue sem o evento.
  }
}

/**
 * Dispara o evento só uma vez por chave nesta aba, para recarregar a página
 * de resultado não contar a mesma partida duas vezes.
 */
export function trackOnce(key: string, event: AnalyticsEvent): void {
  const storageKey = `tracked:${key}`;
  try {
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, "1");
  } catch {
    // Storage bloqueado: melhor contar duas vezes do que nenhuma.
  }
  trackEvent(event);
}
