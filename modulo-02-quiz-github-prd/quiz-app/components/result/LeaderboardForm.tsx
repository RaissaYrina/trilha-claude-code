"use client";

import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { ApiError, submitToLeaderboard } from "@/components/quiz/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { trackEvent } from "@/lib/analytics";
import type { Level } from "@/lib/levels";
import {
  NICKNAME_MAX,
  validateNickname,
  type NicknameError,
} from "@/lib/nickname";

type Props = {
  sessionId: string;
  shareId: string;
  level: Level;
  /** A partida já está no ranking (ex.: a página foi recarregada). */
  submitted: boolean;
};

type ErrorKey = NicknameError | "rateLimited" | "generic";

type State =
  | { status: "idle" | "submitting"; error: ErrorKey | null }
  | { status: "done"; rank: number | null };

/**
 * Registro no ranking. O apelido é validado aqui com as mesmas regras do
 * servidor, que valida de novo e é quem calcula a posição.
 */
export function LeaderboardForm({
  sessionId,
  shareId,
  level,
  submitted,
}: Props) {
  const t = useTranslations("Result.leaderboard");
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const [nickname, setNickname] = useState("");
  const [state, setState] = useState<State>(
    submitted
      ? { status: "done", rank: null }
      : { status: "idle", error: null },
  );

  const rankingHref = `/ranking?level=${level}&me=${shareId}`;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const valid = validateNickname(nickname);
    if (!valid.ok) {
      setState({ status: "idle", error: valid.error });
      return;
    }

    setState({ status: "submitting", error: null });
    try {
      const { rank } = await submitToLeaderboard(sessionId, valid.nickname);
      setState({ status: "done", rank });
      trackEvent({ name: "leaderboard_submitted", props: { level } });
    } catch (error) {
      const code = error instanceof ApiError ? error.code : null;
      if (code === "ALREADY_SUBMITTED") {
        setState({ status: "done", rank: null });
      } else if (code === "RATE_LIMITED") {
        setState({ status: "idle", error: "rateLimited" });
      } else if (code === "INVALID_NICKNAME") {
        setState({ status: "idle", error: "profanity" });
      } else {
        setState({ status: "idle", error: "generic" });
      }
    }
  }

  if (state.status === "done") {
    return (
      <section
        aria-live="polite"
        className="bg-card flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="flex items-center gap-2 font-mono text-sm">
          <Trophy className="text-primary size-4 shrink-0" aria-hidden />
          {state.rank === null
            ? t("already")
            : t("success", { rank: state.rank })}
        </p>
        <Button asChild variant="outline" className="h-10">
          <Link href={rankingHref}>{t("view")}</Link>
        </Button>
      </section>
    );
  }

  const error = state.error;
  return (
    <section className="bg-card flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="font-mono text-base font-semibold">{t("title")}</h2>
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-2 sm:flex-row sm:items-start"
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor={inputId} className="text-sm font-medium">
            {t("label")}
          </label>
          <Input
            id={inputId}
            name="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={NICKNAME_MAX + 10}
            autoComplete="nickname"
            spellCheck={false}
            aria-invalid={error !== null}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            className="h-10 font-mono"
          />
          <p id={hintId} className="text-muted-foreground text-xs">
            {t("hint")}
          </p>
          <p
            id={errorId}
            role="alert"
            className="text-destructive text-sm empty:hidden"
          >
            {error ? t(`errors.${error}`) : ""}
          </p>
        </div>
        <Button
          type="submit"
          disabled={state.status === "submitting"}
          className="h-10 sm:mt-7"
        >
          {state.status === "submitting" ? t("submitting") : t("submit")}
        </Button>
      </form>
    </section>
  );
}
