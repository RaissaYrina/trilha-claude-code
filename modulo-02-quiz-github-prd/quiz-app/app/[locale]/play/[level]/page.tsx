import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { resolveLocale } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import { isLevel, LEVELS } from "@/lib/levels";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    LEVELS.map((level) => ({ locale, level })),
  );
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/play/[level]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { level } = await params;
  if (!isLevel(level)) return {};
  const t = await getTranslations({ locale });
  return {
    title: t("Quiz.title", { level: t(`Play.levels.${level}.name`) }),
    // A partida é pessoal: não faz sentido indexar.
    robots: { index: false },
  };
}

/** Shell estático; a partida em si roda no cliente, falando com /api/sessions. */
export default async function QuizPage({
  params,
}: PageProps<"/[locale]/play/[level]">) {
  const locale = await resolveLocale(params);
  const { level } = await params;
  if (!isLevel(level)) notFound();
  const t = await getTranslations({ locale, namespace: "Play" });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
      <h1 className="text-primary font-mono text-sm">
        $ claude --quiz {t(`levels.${level}.name`).toLowerCase()}
      </h1>
      <QuizRunner level={level} />
    </div>
  );
}
