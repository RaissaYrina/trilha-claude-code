import type { Metadata } from "next";
import { routing, type Locale } from "@/i18n/routing";

/** Código de idioma do `hreflang` e do `og:locale` de cada locale da rota. */
export const LANGUAGE_TAGS: Readonly<Record<Locale, string>> = {
  pt: "pt-BR",
  en: "en",
};

export const OG_LOCALES: Readonly<Record<Locale, string>> = {
  pt: "pt_BR",
  en: "en_US",
};

/**
 * `canonical` e `hreflang` de uma página que existe nos dois idiomas. `path`
 * é o caminho sem o locale ("" para a home, "/play" etc.); as URLs ficam
 * relativas ao `metadataBase` do layout.
 */
export function localeAlternates(
  locale: Locale,
  path: string,
): NonNullable<Metadata["alternates"]> {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(
        routing.locales.map((l) => [LANGUAGE_TAGS[l], `/${l}${path}`]),
      ),
      "x-default": `/${routing.defaultLocale}${path}`,
    },
  };
}
