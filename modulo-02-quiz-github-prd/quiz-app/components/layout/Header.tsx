import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const t = useTranslations("Header");

  return (
    <header className="border-b">
      <a
        href="#conteudo"
        className="bg-primary text-primary-foreground sr-only rounded-md px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        {t("skipToContent")}
      </a>
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
        <Link href="/" className="font-mono text-sm font-semibold sm:text-base">
          <span className="text-primary">&gt;</span> cc-quiz
          <span className="text-primary">_</span>data
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/ranking"
            className="hover:bg-accent rounded-md px-2 py-1 text-sm"
          >
            {t("ranking")}
          </Link>
          <LocaleSwitcher />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
