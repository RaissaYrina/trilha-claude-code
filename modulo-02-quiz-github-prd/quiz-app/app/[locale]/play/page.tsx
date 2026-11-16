import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BestScore } from "@/components/play/BestScore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { LEVELS, QUESTIONS_PER_SESSION } from "@/lib/levels";
import { localeAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/play">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Play" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: localeAlternates(locale, "/play"),
  };
}

export default async function PlayPage({
  params,
}: PageProps<"/[locale]/play">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Play" });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-mono text-3xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </header>
      <ul className="grid gap-4 md:grid-cols-3">
        {LEVELS.map((level) => (
          <li key={level}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="font-mono text-xl">
                  {t(`levels.${level}.name`)}
                </CardTitle>
                <CardDescription>
                  {t(`levels.${level}.audience`)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <p className="text-sm">{t(`levels.${level}.description`)}</p>
                <p className="font-mono text-sm">
                  {t("questionCount", { count: QUESTIONS_PER_SESSION })}
                </p>
                <BestScore level={level} />
              </CardContent>
              <CardFooter>
                <Button asChild className="h-12 w-full text-base">
                  <Link
                    href={`/play/${level}`}
                    aria-label={t("startLevel", {
                      level: t(`levels.${level}.name`),
                    })}
                  >
                    {t("start")}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
