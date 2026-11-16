import { CircleCheck, CircleX, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { LeaderboardForm } from "@/components/result/LeaderboardForm";
import { SaveBestScore } from "@/components/result/SaveBestScore";
import { ShareButtons } from "@/components/result/ShareButtons";
import { TrackCompletion } from "@/components/result/TrackCompletion";
import { Button } from "@/components/ui/button";
import { resolveLocale } from "@/i18n/locale";
import { Link, redirect } from "@/i18n/navigation";
import { uuidSchema } from "@/lib/api";
import { hasEntry } from "@/lib/db/leaderboard";
import { findSession, listAnswers } from "@/lib/db/sessions";
import { toCompletedState } from "@/lib/session";
import { sharePath, siteUrl } from "@/lib/share";
import { cn } from "@/lib/utils";

// Lê o banco a cada requisição: o resultado é de uma partida específica.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/result/[sessionId]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Result" });
  return { title: t("title"), robots: { index: false } };
}

export default async function ResultPage({
  params,
}: PageProps<"/[locale]/result/[sessionId]">) {
  const locale = await resolveLocale(params);
  const { sessionId } = await params;
  if (!uuidSchema.safeParse(sessionId).success) notFound();

  const row = await findSession(sessionId);
  if (!row || row.status === "expired") notFound();
  if (row.status === "in_progress") {
    redirect({ href: `/play/${row.level}`, locale });
  }

  const [answers, submitted] = await Promise.all([
    listAnswers(row.id),
    hasEntry(row.id),
  ]);
  const result = toCompletedState(row, answers, locale);
  const t = await getTranslations({ locale });
  const format = await getFormatter({ locale });
  const totalSeconds = Math.round(result.totalTimeMs / 1000);
  const levelName = t(`Play.levels.${result.level}.name`);
  const shareUrl = `${siteUrl()}${sharePath(locale, result.shareId)}`;
  const shareText = t("Share.text", {
    score: format.number(result.score),
    level: levelName,
  });

  const stats = [
    {
      label: t("Result.score"),
      value: format.number(result.score),
      detail: t("Result.scoreOf", { max: format.number(result.maxScore) }),
    },
    {
      label: t("Result.correct"),
      value: t("Result.correctOf", {
        correct: result.correctCount,
        total: result.total,
      }),
    },
    {
      label: t("Result.time"),
      value: t("Result.duration", {
        minutes: Math.floor(totalSeconds / 60),
        seconds: totalSeconds % 60,
      }),
    },
    { label: t("Result.maxStreak"), value: String(result.maxStreak) },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-3">
        <p className="text-primary font-mono text-sm">
          {t("Result.heading", { level: levelName })}
        </p>
        <h1 className="font-mono text-3xl font-bold tracking-tight text-balance">
          {t(`Result.bands.${result.band}.name`)}
        </h1>
        <p className="text-muted-foreground">
          {t(`Result.bands.${result.band}.description`)}
        </p>
        <SaveBestScore level={result.level} score={result.score} />
        <TrackCompletion
          sessionId={row.id}
          level={result.level}
          score={result.score}
          correct={result.correctCount}
        />
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

      <LeaderboardForm
        sessionId={row.id}
        shareId={result.shareId}
        level={result.level}
        submitted={submitted}
      />

      <ShareButtons url={shareUrl} text={shareText} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild className="h-12 px-6 text-base">
          <Link href={`/play/${result.level}`}>{t("Result.playAgain")}</Link>
        </Button>
        <Button asChild variant="outline" className="h-12 px-6 text-base">
          <Link href="/play">{t("Result.otherLevel")}</Link>
        </Button>
        <Button asChild variant="outline" className="h-12 px-6 text-base">
          <Link href="/ranking">{t("Result.ranking")}</Link>
        </Button>
      </div>

      <section aria-labelledby="revisao" className="flex flex-col gap-4">
        <h2 id="revisao" className="font-mono text-lg font-semibold">
          {t("Result.reviewTitle")}
        </h2>
        <ol className="flex flex-col gap-3">
          {result.review.map((item) => (
            <li
              key={item.id}
              className={cn(
                "bg-card flex flex-col gap-2 rounded-lg border border-l-4 p-4",
                item.correct ? "border-l-success" : "border-l-destructive",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-mono text-sm leading-relaxed">
                  <span className="text-muted-foreground">
                    {item.index + 1}.{" "}
                  </span>
                  {item.statement}
                </p>
                <span className="text-muted-foreground shrink-0 font-mono text-xs">
                  {t("Result.questionPoints", { points: item.points })}
                </span>
              </div>
              <p
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium",
                  item.correct ? "text-success" : "text-destructive",
                )}
              >
                {item.correct ? (
                  <CircleCheck className="size-4" aria-hidden />
                ) : (
                  <CircleX className="size-4" aria-hidden />
                )}
                {item.correct ? t("Quiz.correct") : t("Quiz.incorrect")} ·{" "}
                {t("Result.yourAnswer", { answer: String(item.userAnswer) })}
                {!item.correct &&
                  ` · ${t("Result.correctAnswer", { answer: String(item.correctAnswer) })}`}
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {item.explanation}
              </p>
              <a
                href={item.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex w-fit items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
              >
                {t("Quiz.docLink")}
                <ExternalLink className="size-3.5" aria-hidden />
                <span className="sr-only">{t("Quiz.newTab")}</span>
              </a>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
