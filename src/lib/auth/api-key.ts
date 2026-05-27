/**
 * Validación de API keys para la API pública.
 *
 * Formato: vk_<32 chars random base32>
 * Storage: sha256(key) en columna `key_hash`. Nunca guardamos la key en plain.
 *
 * Uso en un route handler:
 *
 *   const auth = await requireApiKey(request, ["read:paginas"]);
 *   if (!auth.ok) return auth.response;
 *   // ...resto del handler con auth.key
 */

import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type ApiKeyContext = {
  id: string;
  prefix: string;
  label: string;
  scopes: string[];
};

export type AuthResult =
  | { ok: true; key: ApiKeyContext }
  | { ok: false; response: Response };

export function generateApiKey(): { plain: string; prefix: string; hash: string } {
  const random = crypto.randomBytes(20).toString("base64url"); // ~27 chars
  const plain = `vk_${random}`;
  const prefix = plain.slice(0, 8);
  const hash = crypto.createHash("sha256").update(plain).digest("hex");
  return { plain, prefix, hash };
}

function hashKey(plain: string): string {
  return crypto.createHash("sha256").update(plain).digest("hex");
}

function jsonError(status: number, code: string, message: string) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function requireApiKey(
  request: Request,
  requiredScopes: string[] = [],
): Promise<AuthResult> {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    return { ok: false, response: jsonError(401, "missing_auth", "Authorization header requerido (Bearer vk_...)") };
  }

  const plain = auth.slice(7).trim();
  if (!plain.startsWith("vk_")) {
    return { ok: false, response: jsonError(401, "invalid_key_format", "El token debe tener prefijo vk_") };
  }

  const hash = hashKey(plain);
  const supa = supabaseAdmin();

  const { data, error } = await supa
    .from("api_keys")
    .select("id, prefix, label, scopes, expires_at, revoked_at")
    .eq("key_hash", hash)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, response: jsonError(401, "invalid_key", "API key inválida") };
  }

  if (data.revoked_at) {
    return { ok: false, response: jsonError(401, "revoked", "API key revocada") };
  }
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { ok: false, response: jsonError(401, "expired", "API key expirada") };
  }

  // Scope check
  for (const scope of requiredScopes) {
    if (!data.scopes.includes(scope)) {
      return { ok: false, response: jsonError(403, "insufficient_scope", `Falta scope: ${scope}`) };
    }
  }

  // Actualizar last_used_at (fire-and-forget)
  void supa.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);

  return {
    ok: true,
    key: { id: data.id, prefix: data.prefix, label: data.label, scopes: data.scopes },
  };
}
