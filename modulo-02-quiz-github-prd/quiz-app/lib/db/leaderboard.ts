import "server-only";
import type { EntryRow } from "@/lib/leaderboard";
import type { Level } from "@/lib/levels";
import { getSupabase } from "@/lib/supabase/server";

const ENTRY_COLUMNS =
  "nickname, score, correct_count, total_time_ms, created_at";

/** Código do Postgres para violação de unique/PK. */
const UNIQUE_VIOLATION = "23505";

export type NewEntry = {
  session_id: string;
  nickname: string;
  level: Level;
  score: number;
  correct_count: number;
  total_time_ms: number;
};

/** Insere a entrada; o unique em `session_id` barra o segundo registro. */
export async function insertEntry(
  entry: NewEntry,
): Promise<"ok" | "duplicate"> {
  const { error } = await getSupabase()
    .from("leaderboard_entries")
    .insert(entry);
  if (error?.code === UNIQUE_VIOLATION) return "duplicate";
  if (error) throw error;
  return "ok";
}

export async function hasEntry(sessionId: string): Promise<boolean> {
  const { count, error } = await getSupabase()
    .from("leaderboard_entries")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Apelido com que a sessão entrou no ranking, ou null se não entrou. */
export async function findNickname(sessionId: string): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from("leaderboard_entries")
    .select("nickname")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data?.nickname ?? null;
}

/** Top do nível, já na ordem do ranking. `since` nulo = "Sempre". */
export async function listTop(
  level: Level,
  since: string | null,
  limit: number,
): Promise<EntryRow[]> {
  let query = getSupabase()
    .from("leaderboard_entries")
    .select(ENTRY_COLUMNS)
    .eq("level", level);
  if (since) query = query.gte("created_at", since);
  const { data, error } = await query
    .order("score", { ascending: false })
    .order("total_time_ms", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data as EntryRow[];
}

/** Entrada da sessão `shareId` e sua posição no nível e período, ou null. */
export async function findPosition(
  shareId: string,
  level: Level,
  since: string | null,
): Promise<(EntryRow & { rank: number }) | null> {
  const { data, error } = await getSupabase()
    .rpc("leaderboard_position", {
      p_share_id: shareId,
      p_level: level,
      p_since: since,
    })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as EntryRow & { rank: number | string };
  // bigint chega como string ou number, conforme o tamanho.
  return { ...row, rank: Number(row.rank) };
}
