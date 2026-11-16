"use client";

import { useEffect } from "react";
import { trackOnce } from "@/lib/analytics";
import type { Level } from "@/lib/levels";

type Props = {
  sessionId: string;
  level: Level;
  score: number;
  correct: number;
};

/** Envia `quiz_completed` uma vez por partida ao abrir o resultado. */
export function TrackCompletion({ sessionId, level, score, correct }: Props) {
  useEffect(() => {
    trackOnce(`quiz_completed:${sessionId}`, {
      name: "quiz_completed",
      props: { level, score, correct },
    });
  }, [sessionId, level, score, correct]);

  return null;
}
