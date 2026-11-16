import { useTranslations } from "next-intl";

const REPO_URL = "https://github.com/RaissaYrina/trilha-claude-code";

export function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className="text-muted-foreground border-t text-sm">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <p>{t("disclaimer")}</p>
        <p className="flex gap-4">
          <span>{t("credit", { author: "Raissa Yrina" })}</span>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground underline underline-offset-4"
          >
            {t("source")}
          </a>
        </p>
      </div>
    </footer>
  );
}
