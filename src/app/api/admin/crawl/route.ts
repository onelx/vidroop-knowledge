/**
 * Dispara un crawl manual desde el panel admin.
 *
 *   POST /api/admin/crawl  body: { academia_id: string }
 *   → 202 { data: { id, status, started_at } }
 *
 * Protegido por el Basic Auth del proxy (src/proxy.ts) — uso interno del dueño,
 * sin API key. Reemplaza al cron: el crawler solo corre cuando se aprieta el botón.
 */

import { json, jsonError } from "@/lib/api/utils";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { triggerCrawlWorkflow } from "@/lib/github/dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let academiaId: string | undefined;
  try {
    const body = (await request.json()) as { academia_id?: unknown };
    if (typeof body.academia_id === "string") academiaId = body.academia_id;
  } catch {
    /* body inválido */
  }
  if (!academiaId) return jsonError(400, "bad_request", "Falta academia_id");

  const supa = supabaseAdmin();

  const { data: academia, error: aerr } = await supa
    .from("academias")
    .select("id, active")
    .eq("id", academiaId)
    .maybeSingle();

  if (aerr) return jsonError(500, "db_error", aerr.message);
  if (!academia) return jsonError(404, "not_found", "Academia no encontrada");
  if (!academia.active) return jsonError(409, "academia_inactive", "La academia está inactiva");

  // No permitir más de un crawl simultáneo por academia.
  const { data: pending } = await supa
    .from("crawls")
    .select("id, status")
    .eq("academia_id", academiaId)
    .in("status", ["pending", "running"])
    .limit(1)
    .maybeSingle();

  if (pending) {
    return jsonError(409, "crawl_in_progress", `Ya hay un crawl ${pending.status} en curso`);
  }

  const { data: crawl, error: cerr } = await supa
    .from("crawls")
    .insert({
      academia_id: academiaId,
      status: "pending",
      trigger: "manual",
      triggered_by: "admin-panel",
    })
    .select("id, status, started_at")
    .single();

  if (cerr || !crawl) return jsonError(500, "db_error", cerr?.message ?? "Insert falló");

  try {
    await triggerCrawlWorkflow({
      crawl_id: crawl.id,
      academia_id: academiaId,
      triggered_by: "admin-panel",
    });
  } catch (e) {
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
