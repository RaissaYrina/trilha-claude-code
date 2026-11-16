import { ChartColumn, Database, FlaskConical } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { localeAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return { alternates: localeAlternates(locale, "") };
}

const ROLES = [
  { key: "engineering", Icon: Database },
  { key: "analytics", Icon: ChartColumn },
  { key: "science", Icon: FlaskConical },
] as const;

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Home" });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-12 sm:py-20">
      <section className="flex flex-col gap-6">
        <p className="text-primary font-mono text-sm">{t("eyebrow")}</p>
        <h1 className="font-mono text-3xl font-bold tracking-tight text-balance sm:text-5xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg text-pretty">
          {t("subtitle")}
        </p>
        <div className="bg-card max-w-2xl overflow-hidden rounded-lg border font-mono text-sm">
          <div className="bg-muted flex items-center gap-1.5 border-b px-3 py-2">
            <span className="size-2.5 rounded-full bg-red-400" aria-hidden />
            <span className="size-2.5 rounded-full bg-yellow-400" aria-hidden />
            <span className="size-2.5 rounded-full bg-green-400" aria-hidden />
          </div>
          <p className="p-4 leading-relaxed">
            <span className="text-primary" aria-hidden>
              &gt;{" "}
            </span>
            {t("whatIs")}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 px-6 text-base">
            <Link href="/play">{t("start")}</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 px-6 text-base"
          >
            <Link href="/ranking">{t("ranking")}</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="publico">
        <h2 id="publico" className="mb-4 font-mono text-lg font-semibold">
          {t("audienceTitle")}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {ROLES.map(({ key, Icon }) => (
            <li
              key={key}
              className="bg-card flex items-center gap-3 rounded-lg border p-4"
            >
              <Icon className="text-primary size-6 shrink-0" aria-hidden />
              <span className="font-medium">{t(`roles.${key}`)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
