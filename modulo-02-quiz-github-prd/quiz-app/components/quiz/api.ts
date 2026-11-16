import type { Locale } from "@/i18n/routing";
import type { SubmittedEntry } from "@/lib/leaderboard";
import type { Level } from "@/lib/levels";
import type {
  AnswerResponse,
  CompletedState,
  CreatedSession,
  InProgressState,
} from "@/lib/session";

/** Erro de uma rota da API, com o `code` do corpo `{ error: { code } }`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`${status} ${code}`);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json" },
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const code =
      (body as { error?: { code?: string } } | null)?.error?.code ?? "UNKNOWN";
    throw new ApiError(res.status, code);
  }
  return body as T;
}

export function createSession(level: Level, locale: Locale) {
  return request<CreatedSession>("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ level, locale }),
  });
}

export function getSession(id: string, locale: Locale) {
  return request<InProgressState | CompletedState>(
    `/api/sessions/${id}?locale=${locale}`,
  );
}

export function submitAnswer(
  id: string,
  index: number,
  answer: boolean,
  locale: Locale,
) {
  return request<AnswerResponse>(`/api/sessions/${id}/answer`, {
    method: "POST",
    body: JSON.stringify({ index, answer, locale }),
  });
}

export function submitToLeaderboard(id: string, nickname: string) {
  return request<SubmittedEntry>(`/api/sessions/${id}/leaderboard`, {
    method: "POST",
    body: JSON.stringify({ nickname }),
  });
}
