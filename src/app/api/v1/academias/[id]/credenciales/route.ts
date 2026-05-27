import { z } from "zod";
import { json, jsonError } from "@/lib/api/utils";
import { requireApiKey } from "@/lib/auth/api-key";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { encryptCredential } from "@/lib/crypto";

const CreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(500),
  role: z.string().optional(),
  label: z.string().max(60).optional(),
});

export async function GET(request: Request, ctx: RouteContext<"/api/v1/academias/[id]/credenciales">) {
  const auth = await requireApiKey(request, ["read:credentials"]);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("credenciales")
    .select("id, email, role, label, last_used_at, created_at")  // jamás devolvemos password_encrypted
    .eq("academia_id", id)
    .order("created_at", { ascending: false });

  if (error) return jsonError(500, "db_error", error.message);
  return json({ data });
}

export async function POST(request: Request, ctx: RouteContext<"/api/v1/academias/[id]/credenciales">) {
  const auth = await requireApiKey(request, ["write:credentials"]);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Body no es JSON válido");
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_error", "Body inválido", parsed.error.issues);
  }

  let encrypted: Buffer;
  try {
    encrypted = encryptCredential(parsed.data.password);
  } catch (e) {
    return jsonError(500, "encryption_error", e instanceof Error ? e.message : "Encryption failed");
  }

  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("credenciales")
    .insert({
      academia_id: id,
      email: parsed.data.email,
      password_encrypted: `\\x${encrypted.toString("hex")}`, // postgres bytea literal
      role: parsed.data.role ?? null,
      label: parsed.data.label ?? null,
    })
    .select("id, email, role, label, created_at")
    .single();

  if (error) return jsonError(500, "db_error", error.message);
  return json({ data }, { status: 201 });
}
