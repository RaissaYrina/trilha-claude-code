import { render } from "@testing-library/react";
import { domAnimation, LazyMotion } from "framer-motion";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import en from "@/messages/en.json";
import pt from "@/messages/pt.json";

const MESSAGES = { pt, en };

/** Renderiza com o provider de i18n (e o LazyMotion que a partida usa). */
export function renderWithIntl(ui: ReactElement, locale: "pt" | "en" = "pt") {
  return render(
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      <LazyMotion features={domAnimation} strict>
        {ui}
      </LazyMotion>
    </NextIntlClientProvider>,
  );
}
