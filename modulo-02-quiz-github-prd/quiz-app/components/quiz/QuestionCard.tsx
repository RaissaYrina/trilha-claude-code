"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublicQuestion } from "@/lib/questions/loader";

type Props = {
  question: PublicQuestion;
  total: number;
  onAnswer: (answer: boolean) => void;
  /** Resposta dada, depois de responder. */
  selected: boolean | null;
  /** Gabarito, quando o servidor já devolveu. */
  correctAnswer: boolean | null;
  disabled: boolean;
};

const SHORTCUTS: Record<string, boolean> = { v: true, t: true, f: false };

/** Afirmação em estilo janela de terminal, com os botões V/F e atalhos de teclado. */
export function QuestionCard({
  question,
  total,
  onAnswer,
  selected,
  correctAnswer,
  disabled,
}: Props) {
  const t = useTranslations("Quiz");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  // Nova pergunta: leva o foco para o enunciado, para o leitor de tela anunciá-lo.
  useEffect(() => {
    headingRef.current?.focus();
  }, [question.index]);

  useEffect(() => {
    if (disabled) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      const answer = SHORTCUTS[event.key.toLowerCase()];
      if (answer === undefined) return;
      event.preventDefault();
      onAnswer(answer);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled, onAnswer]);

  // Setas trocam o foco entre Verdadeiro e Falso; Enter/Espaço confirmam (nativo do botão).
  const onArrow = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    ) {
      return;
    }
    event.preventDefault();
    const current = buttons.current.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    buttons.current[current === 0 ? 1 : 0]?.focus();
  };

  const options = [
    { value: true, label: t("answerTrue") },
    { value: false, label: t("answerFalse") },
  ];

  return (
    <section className="bg-card overflow-hidden rounded-lg border">
      <div className="bg-muted flex items-center gap-1.5 border-b px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-400" aria-hidden />
        <span className="size-2.5 rounded-full bg-yellow-400" aria-hidden />
        <span className="size-2.5 rounded-full bg-green-400" aria-hidden />
        <span className="text-muted-foreground ml-2 font-mono text-xs">
          {t("progress", { current: question.index + 1, total })}
        </span>
      </div>

      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-mono text-lg leading-relaxed outline-none sm:text-xl"
        >
          <span className="sr-only">
            {t("statement", { current: question.index + 1, total })}:{" "}
          </span>
          <span className="text-primary" aria-hidden>
            &gt;{" "}
          </span>
          {question.statement}
        </h2>

        <div
          role="group"
          aria-label={t("statement", { current: question.index + 1, total })}
          className="grid grid-cols-2 gap-3"
          onKeyDown={onArrow}
        >
          {options.map(({ value, label }, i) => {
            const isSelected = selected === value;
            const isCorrect = correctAnswer === value;
            return (
              <Button
                key={label}
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                type="button"
                variant="outline"
                aria-pressed={isSelected}
                disabled={disabled}
                onClick={() => onAnswer(value)}
                className={cn(
                  "h-14 font-mono text-base disabled:opacity-100",
                  isSelected && "border-primary ring-primary/40 ring-2",
                  correctAnswer !== null &&
                    isCorrect &&
                    "border-success text-success",
                  correctAnswer !== null &&
                    isSelected &&
                    !isCorrect &&
                    "border-destructive text-destructive",
                )}
              >
                {correctAnswer !== null && isCorrect && <Check aria-hidden />}
                {correctAnswer !== null && isSelected && !isCorrect && (
                  <X aria-hidden />
                )}
                {label}
              </Button>
            );
          })}
        </div>

        <p className="text-muted-foreground hidden text-xs sm:block">
          {t("shortcuts")}
        </p>
      </div>
    </section>
  );
}
