import { json, jsonError } from "@/lib/api/utils";
import { requireApiKey } from "@/lib/auth/api-key";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request, ctx: RouteContext<"/api/v1/academias/[id]">) {
  const auth = await requireApiKey(request, ["read:academias"]);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const supa = supabaseAdmin();

  const { data, error } = await supa
    .from("academias")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return jsonError(500, "db_error", error.message);
  if (!data) return jsonError(404, "not_found", "Academia no encontrada");

  return json({ data });
}
