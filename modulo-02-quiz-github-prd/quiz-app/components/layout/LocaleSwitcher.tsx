"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("Header");
  const other = locale === "pt" ? "en" : "pt";

  return (
    <Link
      href={pathname}
      locale={other}
      aria-label={t("switchLocale")}
      className="hover:bg-accent focus-visible:ring-ring rounded-md px-2 py-1 font-mono text-sm uppercase focus-visible:ring-2 focus-visible:outline-none"
    >
      {other}
    </Link>
  );
}
