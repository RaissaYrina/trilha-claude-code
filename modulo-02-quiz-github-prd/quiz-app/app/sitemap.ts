import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { LANGUAGE_TAGS } from "@/lib/seo";
import { siteUrl } from "@/lib/share";

/** Só as páginas públicas e estáveis; partida, resultado e /r ficam de fora. */
const PATHS = ["", "/play", "/ranking"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PATHS.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      changeFrequency: path === "/ranking" ? "daily" : "monthly",
      priority: path === "" ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [LANGUAGE_TAGS[l], `${base}/${l}${path}`]),
        ),
      },
    })),
  );
}
