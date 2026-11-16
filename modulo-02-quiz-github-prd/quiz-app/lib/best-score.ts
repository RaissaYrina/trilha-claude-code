import type { Level } from "./levels";

const keyFor = (level: Level) => `ccquiz:best:${level}`;

/** Melhor pontuação local do nível, ou null se não houver (ou se o storage estiver bloqueado). */
export function readBestScore(level: Level): number | null {
  try {
    const raw = window.localStorage.getItem(keyFor(level));
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}

/** Grava a pontuação se ela superar a melhor atual. Retorna true se gravou. */
export function saveBestScore(level: Level, score: number): boolean {
  const current = readBestScore(level);
  if (current !== null && current >= score) return false;
  try {
    window.localStorage.setItem(keyFor(level), String(score));
    return true;
  } catch {
    return false;
  }
}
