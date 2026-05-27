/**
 * Supabase admin client (service_role).
 * Solo se usa server-side, NUNCA expuesto al cliente.
 * Bypassea RLS — usar con cuidado.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let cached: ReturnType<typeof createClient<Database>> | null = null;

export function supabaseAdmin() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL no está seteada");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY no está seteada");

  cached = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}
