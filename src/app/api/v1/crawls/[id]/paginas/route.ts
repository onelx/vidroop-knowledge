import { clampLimit, json, jsonError } from "@/lib/api/utils";
import { requireApiKey } from "@/lib/auth/api-key";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request, ctx: RouteContext<"/api/v1/crawls/[id]/paginas">) {
  const auth = await requireApiKey(request, ["read:paginas"]);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const url = new URL(request.url);
  const limit = clampLimit(url.searchParams.get("limit"), 100);

  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("paginas")
    .select("id, path, full_url, route_name, title, http_status, captured_at, duration_ms, links_count, forms_count, error_message")
    .eq("crawl_id", id)
    .order("captured_at", { ascending: true })
    .limit(limit);

  if (error) return jsonError(500, "db_error", error.message);
  return json({ data });
}
