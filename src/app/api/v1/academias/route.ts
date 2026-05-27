import { z } from "zod";
import { json, jsonError } from "@/lib/api/utils";
import { requireApiKey } from "@/lib/auth/api-key";
import { supabaseAdmin } from "@/lib/supabase/admin";

const CreateSchema = z.object({
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  label: z.string().min(2).max(120),
  base_url: z.string().url(),
  api_base_url: z.string().url(),
  storefront_url: z.string().url().optional(),
});

export async function GET(request: Request) {
  const auth = await requireApiKey(request, ["read:academias"]);
  if (!auth.ok) return auth.response;

  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("academias")
    .select("id, slug, label, base_url, api_base_url, storefront_url, active, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) return jsonError(500, "db_error", error.message);
  return json({ data });
}

export async function POST(request: Request) {
  const auth = await requireApiKey(request, ["write:academias"]);
  if (!auth.ok) return auth.response;

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

  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("academias")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonError(409, "slug_taken", `Ya existe una academia con slug "${parsed.data.slug}"`);
    }
    return jsonError(500, "db_error", error.message);
  }

  return json({ data }, { status: 201 });
}
