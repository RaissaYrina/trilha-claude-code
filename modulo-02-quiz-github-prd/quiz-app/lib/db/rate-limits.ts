import "server-only";
import { getSupabase } from "@/lib/supabase/server";

/** Soma uma requisição na janela `key` (upsert atômico) e devolve o total. */
export async function hitRateLimit(
  key: string,
  expiresAt: string,
): Promise<number> {
  const { data, error } = await getSupabase().rpc("rate_limit_hit", {
    p_key: key,
    p_expires_at: expiresAt,
  });
  if (error) throw error;
  return data as number;
}
