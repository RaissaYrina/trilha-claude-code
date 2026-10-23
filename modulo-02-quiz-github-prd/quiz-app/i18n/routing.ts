import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pt", "en"],
  defaultLocale: "pt",
  localePrefix: "always",
  localeCookie: {
    // Guarda a escolha de idioma por 1 ano.
    maxAge: 60 * 60 * 24 * 365,
  },
});

export type Locale = (typeof routing.locales)[number];
