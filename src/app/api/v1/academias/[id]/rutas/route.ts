import { json, jsonError } from "@/lib/api/utils";
import { requireApiKey } from "@/lib/auth/api-key";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request, ctx: RouteContext<"/api/v1/academias/[id]/rutas">) {
  const auth = await requireApiKey(request, ["read:routes"]);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const url = new URL(request.url);
  const dynamicOnly = url.searchParams.get("dynamic_only") === "true";

  const supa = supabaseAdmin();
  let q = supa
    .from("rutas")
    .select("id, path_pattern, route_name, is_dynamic, meta, first_seen_at, last_seen_at, last_seen_crawl_id")
    .eq("academia_id", id)
    .order("path_pattern", { ascending: true });

  if (dynamicOnly) q = q.eq("is_dynamic", true);

  const { data, error } = await q;
  if (error) return jsonError(500, "db_error", error.message);

  return json({ data });
}
