import type { Level } from "./levels";

// A partida em andamento fica no sessionStorage: sobrevive ao recarregar a
// página, mas não vaza para outras abas nem fica para sempre no navegador.
const keyFor = (level: Level) => `ccquiz:session:${level}`;

export function readActiveSession(level: Level): string | null {
  try {
    return window.sessionStorage.getItem(keyFor(level));
  } catch {
    return null;
  }
}

export function saveActiveSession(level: Level, sessionId: string): void {
  try {
    window.sessionStorage.setItem(keyFor(level), sessionId);
  } catch {
    // Storage bloqueado: a partida segue, só não poderá ser retomada.
  }
}

export function clearActiveSession(level: Level): void {
  try {
    window.sessionStorage.removeItem(keyFor(level));
  } catch {
    // Nada a limpar se o storage estiver bloqueado.
  }
}
