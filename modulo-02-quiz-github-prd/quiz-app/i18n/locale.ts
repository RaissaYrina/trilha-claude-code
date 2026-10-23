import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "./routing";

/**
 * Lê o locale dos params da rota, responde 404 se for inválido e o registra
 * para a renderização estática (`setRequestLocale`).
 */
export async function resolveLocale(
  params: Promise<{ locale: string }>,
): Promise<Locale> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return locale;
}
