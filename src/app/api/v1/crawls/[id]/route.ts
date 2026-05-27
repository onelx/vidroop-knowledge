import { json, jsonError } from "@/lib/api/utils";
import { requireApiKey } from "@/lib/auth/api-key";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request, ctx: RouteContext<"/api/v1/crawls/[id]">) {
  const auth = await requireApiKey(request, ["read:crawls"]);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const supa = supabaseAdmin();

  const { data, error } = await supa
    .from("crawls")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return jsonError(500, "db_error", error.message);
  if (!data) return jsonError(404, "not_found", "Crawl no encontrado");

  return json({ data });
}
