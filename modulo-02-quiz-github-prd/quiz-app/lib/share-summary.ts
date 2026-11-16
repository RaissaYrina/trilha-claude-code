import "server-only";
import { findNickname } from "@/lib/db/leaderboard";
import { findSessionByShareId } from "@/lib/db/sessions";
import { SHARE_ID, toShareSummary, type ShareSummary } from "@/lib/share";

/** Resumo público de uma partida concluída, ou null (id inválido, em andamento, expirada). */
export async function getShareSummary(
  shareId: string,
): Promise<ShareSummary | null> {
  if (!SHARE_ID.test(shareId)) return null;
  const row = await findSessionByShareId(shareId);
  if (!row || row.status !== "completed") return null;
  return toShareSummary(row, await findNickname(row.id));
}
