"use client";

import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { saveBestScore } from "@/lib/best-score";
import type { Level } from "@/lib/levels";

/** Grava a pontuação no localStorage se for a melhor do nível e avisa quando for. */
export function SaveBestScore({
  level,
  score,
}: {
  level: Level;
  score: number;
}) {
  const t = useTranslations("Result");
  const [isNewBest, setIsNewBest] = useState(false);

  useEffect(() => {
    // Sincroniza com um sistema externo (o storage); o setState só reflete o resultado.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsNewBest(saveBestScore(level, score));
  }, [level, score]);

  if (!isNewBest) return null;
  return (
    <p className="text-primary flex items-center gap-2 font-mono text-sm">
      <Trophy className="size-4" aria-hidden />
      {t("newBest")}
    </p>
  );
}
