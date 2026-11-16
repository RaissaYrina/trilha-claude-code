import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { findPosition, listTop } from "@/lib/db/leaderboard";
import {
  isPeriod,
  LEADERBOARD_LIMIT,
  PERIODS,
  periodStart,
  toEntries,
  toEntry,
  type LeaderboardEntry,
  type Period,
} from "@/lib/leaderboard";
import { isLevel, LEVELS, type Level } from "@/lib/levels";
import { localeAlternates } from "@/lib/seo";
import { SHARE_ID } from "@/lib/share";
import { cn } from "@/lib/utils";

// Depende da query (nível, período, destaque); o top muda a cada registro.
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/ranking">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Ranking" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: localeAlternates(locale, "/ranking"),
  };
}

export default async function RankingPage({
  params,
  searchParams,
}: PageProps<"/[locale]/ranking">) {
  const locale = await resolveLocale(params);
  const query = await searchParams;
  const levelParam = first(query.level);
  const periodParam = first(query.period);
  const meParam = first(query.me);
  const level: Level = isLevel(levelParam) ? levelParam : "beginner";
  const period: Period = isPeriod(periodParam) ? periodParam : "all";
  const me = SHARE_ID.test(meParam) ? meParam : null;

  const since = periodStart(period, new Date());
  const [rows, mine] = await Promise.all([
    listTop(level, since, LEADERBOARD_LIMIT),
    me ? findPosition(me, level, since) : null,
  ]);
  const entries = toEntries(rows);
  const myEntry = mine ? toEntry(mine, mine.rank) : null;
  // Dentro do top a linha do jogador é destacada; fora dele, aparece abaixo.
  const myRank =
    myEntry && myEntry.rank <= entries.length ? myEntry.rank : null;
  const showMineBelow = myEntry !== null && myRank === null;

  const t = await getTranslations({ locale });
  const format = await getFormatter({ locale });
  const levelName = t(`Play.levels.${level}.name`);

  const href = (next: { level?: Level; period?: Period }) => {
    const search = new URLSearchParams({
      level: next.level ?? level,
      period: next.period ?? period,
    });
    if (me) search.set("me", me);
    return `/ranking?${search}`;
  };

  const duration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    return t("Result.duration", {
      minutes: Math.floor(seconds / 60),
      seconds: seconds % 60,
    });
  };

  const row = (entry: LeaderboardEntry, highlight: boolean) => (
    <tr
      key={`${entry.rank}-${entry.createdAt}`}
      aria-current={highlight ? "true" : undefined}
      className={cn(
        "border-b last:border-b-0",
        highlight && "bg-primary/10 font-semibold",
      )}
    >
      <td className="px-3 py-2 font-mono">{entry.rank}</td>
      <td className="max-w-[10rem] truncate px-3 py-2 font-mono">
        {entry.nickname}
        {highlight && (
          <span className="text-primary"> ({t("Ranking.you")})</span>
        )}
      </td>
      <td className="px-3 py-2 text-right font-mono">
        {format.number(entry.score)}
      </td>
      <td className="hidden px-3 py-2 text-right font-mono sm:table-cell">
        {entry.correct}
      </td>
      <td className="hidden px-3 py-2 text-right font-mono md:table-cell">
        {duration(entry.timeMs)}
      </td>
      <td className="hidden px-3 py-2 text-right md:table-cell">
        {format.dateTime(new Date(entry.createdAt), { dateStyle: "short" })}
      </td>
    </tr>
  );

  const pill = (active: boolean) =>
    cn(
      "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "hover:bg-accent",
    );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-mono text-3xl font-bold tracking-tight">
          {t("Ranking.title")}
        </h1>
        <p className="text-muted-foreground">{t("Ranking.subtitle")}</p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <nav aria-label={t("Ranking.levelsLabel")}>
          <ul className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <li key={l}>
                <Link
                  href={href({ level: l })}
                  aria-current={l === level ? "page" : undefined}
                  className={pill(l === level)}
                >
                  {t(`Play.levels.${l}.name`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t("Ranking.periodLabel")}>
          <ul className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <li key={p}>
                <Link
                  href={href({ period: p })}
                  aria-current={p === period ? "page" : undefined}
                  className={pill(p === period)}
                >
                  {t(`Ranking.periods.${p}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {me && !myEntry && (
        <p className="text-muted-foreground text-sm">
          {t("Ranking.notInPeriod")}
        </p>
      )}

      {entries.length === 0 ? (
        <div className="bg-card flex flex-col items-start gap-4 rounded-lg border p-6">
          <p>{t("Ranking.empty")}</p>
          <Button asChild className="h-11">
            <Link href={`/play/${level}`}>{t("Ranking.play")}</Link>
          </Button>
        </div>
      ) : (
        <div className="bg-card overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <caption className="sr-only">
              {t("Ranking.caption", {
                level: levelName,
                period: t(`Ranking.periods.${period}`),
              })}
            </caption>
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr className="border-b">
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  {t("Ranking.rank")}
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  {t("Ranking.nickname")}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {t("Ranking.score")}
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-2 text-right font-medium sm:table-cell"
                >
                  {t("Ranking.correct")}
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-2 text-right font-medium md:table-cell"
                >
                  {t("Ranking.time")}
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-2 text-right font-medium md:table-cell"
                >
                  {t("Ranking.date")}
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => row(entry, entry.rank === myRank))}
            </tbody>
            {showMineBelow && myEntry && (
              <tbody className="border-t-2 border-dashed">
                <tr>
                  <th
                    scope="row"
                    colSpan={6}
                    className="text-muted-foreground px-3 pt-2 text-left text-xs font-medium"
                  >
                    {t("Ranking.yourPosition")}
                  </th>
                </tr>
                {row(myEntry, true)}
              </tbody>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
