/**
 * Detiene un crawl en curso desde el panel admin.
 *
 *   POST /api/admin/crawl/stop  body: { crawl_id: string }
 *   → 200 { data: { id, status } }
 *
 * Protegido por el Basic Auth del proxy (src/proxy.ts).
 *
 * Mecanismo:
 *  1. Marca el crawl como 'cancelled' en la BD (fuente de verdad). El crawler
 *     chequea este estado entre páginas y aborta el recorrido (cancelación
 *     cooperativa), sin pisar el estado a completed/partial.
 *  2. Best-effort: cancela la corrida de GitHub Actions (si se conoce gh_run_id)
 *     para liberar el runner de inmediato.
 */

import { json, jsonError } from "@/lib/api/utils";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { cancelWorkflowRun } from "@/lib/github/dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let crawlId: string | undefined;
  try {
    const body = (await request.json()) as { crawl_id?: unknown };
    if (typeof body.crawl_id === "string") crawlId = body.crawl_id;
  } catch {
    /* body inválido */
  }
  if (!crawlId) return jsonError(400, "bad_request", "Falta crawl_id");

  const supa = supabaseAdmin();

  const { data: crawl, error: cerr } = await supa
    .from("crawls")
    .select("id, status, gh_run_id")
    .eq("id", crawlId)
    .maybeSingle();

  if (cerr) return jsonError(500, "db_error", cerr.message);
  if (!crawl) return jsonError(404, "not_found", "Crawl no encontrado");
  if (crawl.status !== "pending" && crawl.status !== "running") {
    return jsonError(409, "not_active", `El crawl no está en curso (estado: ${crawl.status})`);
  }

  // 1. Fuente de verdad: marcar cancelled. El crawler lo detecta y aborta.
  const { error: uerr } = await supa
    .from("crawls")
    .update({
      status: "cancelled",
      ended_at: new Date().toISOString(),
      error_message: "Cancelado manualmente desde el panel admin",
    })
    .eq("id", crawlId);

  if (uerr) return jsonError(500, "db_error", uerr.message);

  // 2. Best-effort: cancelar la corrida de GitHub Actions para liberar el runner ya.
  let runCancelled = false;
  let runWarning: string | null = null;
  if (crawl.gh_run_id) {
    try {
      await cancelWorkflowRun(crawl.gh_run_id);
      runCancelled = true;
    } catch (e) {
      runWarning = e instanceof Error ? e.message : "no se pudo cancelar la corrida";
    }
  }

  return json({
    data: { id: crawl.id, status: "cancelled", run_cancelled: runCancelled, run_warning: runWarning },
  });
}
