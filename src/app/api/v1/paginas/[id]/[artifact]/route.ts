/**
 * Handler unificado para los artefactos de una página:
 *   GET /v1/paginas/:id/html         → HTML del scrape
 *   GET /v1/paginas/:id/screenshot   → PNG
 *   GET /v1/paginas/:id/dom-tree     → JSON del accessibility tree
 *   GET /v1/paginas/:id/text         → texto plano extraído (en DB, no en Storage)
 */

import { jsonError } from "@/lib/api/utils";
import { requireApiKey } from "@/lib/auth/api-key";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ARTIFACT_MAP = {
  html: { column: "html_path", contentType: "text/html; charset=utf-8" },
  screenshot: { column: "screenshot_path", contentType: "image/png" },
  "dom-tree": { column: "dom_tree_path", contentType: "application/json" },
} as const;

type Artifact = keyof typeof ARTIFACT_MAP;

export async function GET(request: Request, ctx: RouteContext<"/api/v1/paginas/[id]/[artifact]">) {
  const auth = await requireApiKey(request, ["read:paginas"]);
  if (!auth.ok) return auth.response;

  const { id, artifact } = await ctx.params;

  // Caso especial: texto plano vive en la columna text_content
  if (artifact === "text") {
    const supa = supabaseAdmin();
    const { data, error } = await supa
      .from("paginas")
      .select("text_content")
      .eq("id", id)
      .maybeSingle();
    if (error) return jsonError(500, "db_error", error.message);
    if (!data?.text_content) return jsonError(404, "not_found", "Sin texto almacenado");
    return new Response(data.text_content, { headers: { "content-type": "text/plain; charset=utf-8" } });
  }

  if (!(artifact in ARTIFACT_MAP)) {
    return jsonError(400, "invalid_artifact", `Artifact desconocido: ${artifact}`);
  }

  const meta = ARTIFACT_MAP[artifact as Artifact];
  const supa = supabaseAdmin();

  const { data: pagina, error: perr } = await supa
    .from("paginas")
    .select(meta.column)
    .eq("id", id)
    .maybeSingle();

  if (perr) return jsonError(500, "db_error", perr.message);
  if (!pagina) return jsonError(404, "not_found", "Página no encontrada");

  const path = (pagina as Record<string, string | null>)[meta.column];
  if (!path) return jsonError(404, "artifact_missing", `La página no tiene ${artifact}`);

  // Bajar el archivo desde Storage
  const { data: blob, error: serr } = await supa.storage
    .from("crawl-artifacts")
    .download(path);

  if (serr || !blob) return jsonError(404, "storage_error", serr?.message ?? "Storage download falló");

  const buf = await blob.arrayBuffer();
  return new Response(buf, { headers: { "content-type": meta.contentType } });
}
