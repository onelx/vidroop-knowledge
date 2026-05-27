import { clampLimit, encodeCursor, decodeCursor, json, jsonError } from "@/lib/api/utils";
import { requireApiKey } from "@/lib/auth/api-key";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { triggerCrawlWorkflow } from "@/lib/github/dispatch";

export async function GET(request: Request, ctx: RouteContext<"/api/v1/academias/[id]/crawls">) {
  const auth = await requireApiKey(request, ["read:crawls"]);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const url = new URL(request.url);
  const limit = clampLimit(url.searchParams.get("limit"));
  const cursor = decodeCursor(url.searchParams.get("cursor"));
  const status = url.searchParams.get("status");

  const supa = supabaseAdmin();
  let q = supa
    .from("crawls")
    .select("id, status, trigger, triggered_by, started_at, ended_at, duration_ms, pages_total, pages_success, pages_failed, error_message")
    .eq("academia_id", id)
    .order("started_at", { ascending: false })
    .limit(limit + 1);

  if (status) q = q.eq("status", status as never);
  if (cursor) q = q.lt("started_at", cursor.ts);

  const { data, error } = await q;
  if (error) return jsonError(500, "db_error", error.message);

  const items = data ?? [];
  const hasMore = items.length > limit;
  const sliced = hasMore ? items.slice(0, limit) : items;
  const next = hasMore && sliced.length > 0
    ? encodeCursor({ ts: sliced[sliced.length - 1].started_at, id: sliced[sliced.length - 1].id })
    : null;

  return json({ data: sliced, next_cursor: next });
}

export async function POST(request: Request, ctx: RouteContext<"/api/v1/academias/[id]/crawls">) {
  const auth = await requireApiKey(request, ["trigger:crawl"]);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const supa = supabaseAdmin();

  // Verificar que la academia existe y está activa
  const { data: academia, error: aerr } = await supa
    .from("academias")
    .select("id, active")
    .eq("id", id)
    .maybeSingle();

  if (aerr) return jsonError(500, "db_error", aerr.message);
  if (!academia) return jsonError(404, "not_found", "Academia no encontrada");
  if (!academia.active) return jsonError(409, "academia_inactive", "La academia está inactiva");

  // Verificar que no haya un crawl pending/running
  const { data: pending } = await supa
    .from("crawls")
    .select("id, status")
    .eq("academia_id", id)
    .in("status", ["pending", "running"])
    .limit(1)
    .maybeSingle();

  if (pending) {
    return jsonError(409, "crawl_in_progress", `Ya hay un crawl ${pending.status} (id: ${pending.id})`);
  }

  // Crear crawl row en status pending
  const { data: crawl, error: cerr } = await supa
    .from("crawls")
    .insert({
      academia_id: id,
      status: "pending",
      trigger: "api",
      triggered_by: auth.key.label,
    })
    .select("id, status, started_at")
    .single();

  if (cerr || !crawl) return jsonError(500, "db_error", cerr?.message ?? "Insert falló");

  // Disparar workflow de GitHub Actions
  try {
    await triggerCrawlWorkflow({
      crawl_id: crawl.id,
      academia_id: id,
      triggered_by: auth.key.label,
    });
  } catch (e) {
    // Revertir status a failed si dispatch falla
    await supa
      .from("crawls")
      .update({
        status: "failed",
        ended_at: new Date().toISOString(),
        error_message: `Dispatch falló: ${e instanceof Error ? e.message : "unknown"}`,
      })
      .eq("id", crawl.id);
    return jsonError(502, "dispatch_failed", e instanceof Error ? e.message : "unknown");
  }

  return json({ data: crawl }, { status: 202 });
}
