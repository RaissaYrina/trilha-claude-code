import { expect, it } from "vitest";
import { localeAlternates } from "@/lib/seo";

it("localeAlternates aponta canonical, hreflang dos dois idiomas e x-default", () => {
  expect(localeAlternates("en", "/play")).toEqual({
    canonical: "/en/play",
    languages: {
      "pt-BR": "/pt/play",
      en: "/en/play",
      "x-default": "/pt/play",
    },
  });
  expect(localeAlternates("pt", "").canonical).toBe("/pt");
});
