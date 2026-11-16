import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

let client: SupabaseClient | undefined;

/**
 * Cliente Supabase com a chave service_role, só para Route Handlers.
 * Criado na primeira chamada: o build não precisa das variáveis, mas a primeira
 * requisição falha com uma mensagem clara se alguma estiver faltando.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Variáveis de ambiente do Supabase inválidas: ${missing}`);
  }
  client = createClient(
    parsed.data.SUPABASE_URL,
    parsed.data.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return client;
}
