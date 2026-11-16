"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { readBestScore } from "@/lib/best-score";
import type { Level } from "@/lib/levels";

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

export function BestScore({ level }: { level: Level }) {
  const t = useTranslations("Play");
  const format = useFormatter();
  // No servidor (HTML estático) não há storage: renderiza o estado vazio e hidrata depois.
  const best = useSyncExternalStore(
    subscribe,
    () => readBestScore(level),
    () => null,
  );

  return (
    <p className="text-muted-foreground text-sm">
      {best === null
        ? t("noBestScore")
        : t("bestScore", { score: format.number(best) })}
    </p>
  );
}
