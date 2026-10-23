"use client";

import { domAnimation, LazyMotion } from "framer-motion";
import { Flame, Timer } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  clearActiveSession,
  readActiveSession,
  saveActiveSession,
} from "@/lib/active-session";
import type { Level } from "@/lib/levels";
import type { PublicQuestion } from "@/lib/questions/loader";
import type { AnswerResponse } from "@/lib/session";
import { ApiError, createSession, getSession, submitAnswer } from "./api";
import { Feedback } from "./Feedback";
import { QuestionCard } from "./QuestionCard";

type Game = {
  sessionId: string;
  total: number;
  question: PublicQuestion;
  score: number;
  streak: number;
};

type State =
  | { status: "loading" }
  | { status: "error"; reason: "network" | "expired" }
  | {
      status: "playing";
      game: Game;
      selected: boolean | null;
      result: AnswerResponse | null;
    };

type Action =
  | { type: "loading" }
  | { type: "loaded"; game: Game }
  | { type: "submit"; answer: boolean }
  | { type: "answered"; result: AnswerResponse }
  | { type: "next"; question: PublicQuestion }
  | { type: "failed"; reason: "network" | "expired" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loading":
      return { status: "loading" };
    case "loaded":
      return {
        status: "playing",
        game: action.game,
        selected: null,
        result: null,
      };
    case "failed":
      return { status: "error", reason: action.reason };
    case "submit":
      if (state.status !== "playing") return state;
      return { ...state, selected: action.answer };
    case "answered":
      if (state.status !== "playing") return state;
      return {
        ...state,
        result: action.result,
        game: {
          ...state.game,
          score: action.result.score,
          streak: action.result.streak,
        },
      };
    case "next":
      if (state.status !== "playing") return state;
      return {
        status: "playing",
        game: { ...state.game, question: action.question },
        selected: null,
        result: null,
      };
  }
}

/** Mostra o streak com 🔥 a partir de 3 acertos seguidos. */
const STREAK_FIRE = 3;

export function QuizRunner({ level }: { level: Level }) {
  const t = useTranslations("Quiz");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, { status: "loading" });

  // Cria a partida ou retoma a guardada no sessionStorage.
  const start = useCallback(
    async (fresh = false) => {
      dispatch({ type: "loading" });
      try {
        const stored = fresh ? null : readActiveSession(level);
        if (stored) {
          try {
            const session = await getSession(stored, locale);
            if (session.status === "completed") {
              clearActiveSession(level);
              router.replace(`/result/${stored}`);
              return;
            }
            dispatch({
              type: "loaded",
              game: {
                sessionId: stored,
                total: session.total,
                question: session.question,
                score: session.score,
                streak: session.streak,
              },
            });
            return;
          } catch (error) {
            // Sessão sumiu ou expirou: começa outra em silêncio.
            if (
              !(error instanceof ApiError) ||
              ![404, 410].includes(error.status)
            ) {
              throw error;
            }
            clearActiveSession(level);
          }
        }
        const created = await createSession(level, locale);
        saveActiveSession(level, created.sessionId);
        dispatch({
          type: "loaded",
          game: { ...created, score: 0, streak: 0 },
        });
      } catch {
        dispatch({ type: "failed", reason: "network" });
      }
    },
    [level, locale, router],
  );

  // O efeito roda duas vezes no StrictMode (dev); a ref evita criar duas sessões.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start();
  }, [start]);

  const playing = state.status === "playing" ? state : null;

  const answer = useCallback(
    async (value: boolean) => {
      if (!playing || playing.selected !== null) return;
      const { sessionId, question } = playing.game;
      dispatch({ type: "submit", answer: value });
      try {
        const result = await submitAnswer(
          sessionId,
          question.index,
          value,
          locale,
        );
        dispatch({ type: "answered", result });
        if (result.completed) clearActiveSession(level);
      } catch (error) {
        if (error instanceof ApiError && error.status === 410) {
          clearActiveSession(level);
          dispatch({ type: "failed", reason: "expired" });
        } else if (error instanceof ApiError && error.status === 409) {
          void start(); // Respondida em outra aba: sincroniza com o servidor.
        } else {
          dispatch({ type: "failed", reason: "network" });
        }
      }
    },
    [playing, locale, level, start],
  );

  const next = () => {
    if (!playing?.result) return;
    if (playing.result.next) {
      dispatch({ type: "next", question: playing.result.next });
    } else {
      router.push(`/result/${playing.game.sessionId}`);
    }
  };

  if (state.status === "loading") {
    return (
      <p role="status" className="text-muted-foreground font-mono">
        {t("loading")}
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <div
        role="alert"
        className="bg-card flex flex-col gap-4 rounded-lg border p-6"
      >
        <h2 className="font-mono text-lg font-semibold">{t("errorTitle")}</h2>
        <p className="text-muted-foreground">
          {state.reason === "expired" ? t("errorExpired") : t("errorNetwork")}
        </p>
        <Button
          onClick={() => void start(state.reason === "expired")}
          className="h-12 w-full sm:w-auto sm:self-start"
        >
          {state.reason === "expired" ? t("newGame") : t("retry")}
        </Button>
      </div>
    );
  }

  const { game, selected, result } = state;
  return (
    <LazyMotion features={domAnimation} strict>
      <div className="flex flex-col gap-4">
        <StatusBar
          key={game.question.index}
          score={game.score}
          streak={game.streak}
          running={result === null}
        />
        <QuestionCard
          question={game.question}
          total={game.total}
          onAnswer={answer}
          selected={selected}
          correctAnswer={result?.correctAnswer ?? null}
          disabled={selected !== null}
        />
        <Feedback result={result} onNext={next} />
      </div>
    </LazyMotion>
  );
}

/** Placar, sequência e cronômetro local (só visual: o tempo que conta é o do servidor). */
function StatusBar({
  score,
  streak,
  running,
}: {
  score: number;
  streak: number;
  running: boolean;
}) {
  const t = useTranslations("Quiz");
  const format = useFormatter();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  return (
    <dl className="grid grid-cols-3 gap-2 font-mono text-sm">
      <div className="bg-card rounded-md border px-3 py-2">
        <dt className="text-muted-foreground text-xs">{t("score")}</dt>
        <dd className="text-base font-semibold">{format.number(score)}</dd>
      </div>
      <div className="bg-card rounded-md border px-3 py-2">
        <dt className="text-muted-foreground text-xs">{t("streak")}</dt>
        <dd className="flex items-center gap-1 text-base font-semibold">
          <span className="sr-only">{t("streakLabel", { count: streak })}</span>
          <span aria-hidden>{streak}</span>
          {streak >= STREAK_FIRE && (
            <Flame className="text-primary size-4" aria-hidden />
          )}
        </dd>
      </div>
      <div className="bg-card rounded-md border px-3 py-2">
        <dt className="text-muted-foreground flex items-center gap-1 text-xs">
          <Timer className="size-3" aria-hidden />
          {t("timer")}
        </dt>
        <dd className="text-base font-semibold" aria-hidden>
          {seconds}s
        </dd>
      </div>
    </dl>
  );
}
