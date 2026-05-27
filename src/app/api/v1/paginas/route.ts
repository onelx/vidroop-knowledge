import { clampLimit, json, jsonError } from "@/lib/api/utils";
import { requireApiKey } from "@/lib/auth/api-key";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await requireApiKey(request, ["read:paginas"]);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const academiaId = url.searchParams.get("academia_id");
  const path = url.searchParams.get("path");
  const limit = clampLimit(url.searchParams.get("limit"), 50);

  const supa = supabaseAdmin();

  // Si filtran por academia, join via crawls
  let q;
  if (academiaId) {
    q = supa
      .from("paginas")
      .select("id, crawl_id, path, full_url, route_name, title, http_status, captured_at, crawls!inner(academia_id)")
      .eq("crawls.academia_id", academiaId)
      .order("captured_at", { ascending: false })
      .limit(limit);
  } else {
    q = supa
      .from("paginas")
      .select("id, crawl_id, path, full_url, route_name, title, http_status, captured_at")
      .order("captured_at", { ascending: false })
      .limit(limit);
  }

  if (path) q = q.eq("path", path);

  const { data, error } = await q;
  if (error) return jsonError(500, "db_error", error.message);

  return json({ data });
}
