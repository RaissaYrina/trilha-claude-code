"use client";

import { CircleCheck, CircleX, ExternalLink } from "lucide-react";
import { m, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnswerResponse } from "@/lib/session";

type Props = {
  result: AnswerResponse | null;
  onNext: () => void;
};

/**
 * Resultado da resposta. A região `aria-live` fica sempre montada, para o
 * leitor de tela anunciar o conteúdo quando ele aparece. O acerto é indicado
 * por cor, ícone e texto ao mesmo tempo.
 */
export function Feedback({ result, onNext }: Props) {
  const t = useTranslations("Quiz");
  const reduceMotion = useReducedMotion();

  return (
    <div aria-live="polite" aria-atomic="true">
      {result && (
        <div
          className={cn(
            "bg-card flex flex-col gap-4 rounded-lg border-l-4 p-4 sm:p-6",
            result.correct ? "border-l-success" : "border-l-destructive",
          )}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p
              className={cn(
                "flex items-center gap-2 font-mono text-lg font-semibold",
                result.correct ? "text-success" : "text-destructive",
              )}
            >
              {result.correct ? (
                <CircleCheck className="size-5" aria-hidden />
              ) : (
                <CircleX className="size-5" aria-hidden />
              )}
              {result.correct ? t("correct") : t("incorrect")}
            </p>
            {result.points > 0 && (
              <m.p
                key={result.score}
                className="text-primary font-mono text-sm"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {t("points", { points: result.points })}
                {result.bonus > 0 && (
                  <span className="text-muted-foreground">
                    {" "}
                    ({t("bonus", { bonus: result.bonus })})
                  </span>
                )}
              </m.p>
            )}
          </div>

          <p className="font-medium">
            {t("answerWas", { answer: String(result.correctAnswer) })}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {result.explanation}
          </p>
          <a
            href={result.docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex w-fit items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
          >
            {t("docLink")}
            <ExternalLink className="size-3.5" aria-hidden />
            <span className="sr-only">{t("newTab")}</span>
          </a>

          <Button
            autoFocus
            onClick={onNext}
            className="h-12 w-full text-base sm:w-auto sm:self-end"
          >
            {result.completed ? t("seeResult") : t("next")}
          </Button>
        </div>
      )}
    </div>
  );
}
