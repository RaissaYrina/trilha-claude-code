import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { sharePath } from "@/lib/share";
import { getShareSummary } from "@/lib/share-summary";

// Lê o banco: o apelido pode ser registrado depois do compartilhamento.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/r/[shareId]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { shareId } = await params;
  const summary = await getShareSummary(shareId);
  if (!summary) return {};

  const t = await getTranslations({ locale });
  const format = await getFormatter({ locale });
  const name = summary.nickname ?? t("Share.anonymous");
  const level = t(`Play.levels.${summary.level}.name`);
  const score = format.number(summary.score);
  const title = t("Share.title", { name });
  const description = t("Share.description", {
    score,
    correct: summary.correct,
    total: summary.total,
    level,
  });
  const image = {
    url: `/api/og/${shareId}?locale=${locale}`,
    width: 1200,
    height: 630,
    alt: t("Share.ogAlt", { name, score, level }),
  };

  return {
    title,
    description,
    // Página para compartilhar, não para busca.
    robots: { index: false },
    openGraph: {
      type: "website",
      url: sharePath(locale, shareId),
      title,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

/** Resumo público da partida (PRD RF07): placar e faixa, sem as perguntas. */
export default async function SharedResultPage({
  params,
}: PageProps<"/[locale]/r/[shareId]">) {
  const locale = await resolveLocale(params);
  const { shareId } = await params;
  const summary = await getShareSummary(shareId);
  if (!summary) notFound();

  const t = await getTranslations({ locale });
  const format = await getFormatter({ locale });
  const name = summary.nickname ?? t("Share.anonymous");
  const level = t(`Play.levels.${summary.level}.name`);
  const totalSeconds = Math.round(summary.totalTimeMs / 1000);

  const stats = [
    {
      label: t("Result.score"),
      value: format.number(summary.score),
      detail: t("Result.scoreOf", { max: format.number(summary.maxScore) }),
    },
    {
      label: t("Result.correct"),
      value: t("Result.correctOf", {
        correct: summary.correct,
        total: summary.total,
      }),
    },
    {
      label: t("Result.time"),
      value: t("Result.duration", {
        minutes: Math.floor(totalSeconds / 60),
        seconds: totalSeconds % 60,
      }),
    },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-3">
        <p className="text-primary font-mono text-sm">
          {t("Share.heading", { name, level })}
        </p>
        <h1 className="font-mono text-3xl font-bold tracking-tight text-balance">
          {t(`Result.bands.${summary.band}.name`)}
        </h1>
      </header>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map(({ label, value, detail }) => (
          <div key={label} className="bg-card rounded-lg border p-4">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="font-mono text-xl font-semibold">{value}</dd>
            {detail && (
              <dd className="text-muted-foreground text-xs">{detail}</dd>
            )}
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild className="h-12 px-6 text-base">
          <Link href={`/play/${summary.level}`}>{t("Share.cta")}</Link>
        </Button>
        <Button asChild variant="outline" className="h-12 px-6 text-base">
          <Link href={`/ranking?level=${summary.level}`}>
            {t("Result.ranking")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
