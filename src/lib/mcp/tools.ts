/**
 * Definición de las MCP tools que exponen la base de conocimiento de Vidroop.
 *
 * Cada tool declara el `scope` de API key que requiere (mismos scopes que la
 * API REST, validados en el dispatcher antes de ejecutar el handler).
 * El resultado sigue el shape de `tools/call` de MCP: { content, isError? }.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { triggerCrawlWorkflow } from "@/lib/github/dispatch";

export type ToolContext = { label: string };

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export type ToolDef = {
  name: string;
  description: string;
  scope: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
};

function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function clampNum(raw: unknown, def: number, max: number): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 1) return def;
  return Math.min(Math.floor(n), max);
}

// PostgREST interpreta , ( ) * % \ dentro de un filtro .or(): los sacamos
// para que el texto del usuario no rompa la query.
function sanitizeForOr(q: string): string {
  return q.replace(/[,()*%\\]/g, " ").trim();
}

export const TOOLS: ToolDef[] = [
  {
    name: "list_academias",
    description:
      "Lista las academias (targets) registradas. Empezá por acá: casi todas las otras tools necesitan un academia_id de esta lista.",
    scope: "read:academias",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async () => {
      const supa = supabaseAdmin();
      const { data, error } = await supa
        .from("academias")
        .select("id, slug, label, base_url, api_base_url, storefront_url, active, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (error) return fail(`db_error: ${error.message}`);
      return ok({ count: data?.length ?? 0, academias: data });
    },
  },

  {
    name: "search_paginas",
    description:
      "Busca páginas crawleadas por texto (en path y título), academia y/o path exacto. Devuelve metadatos. Para el contenido usá get_pagina o los resources vidroop://pagina/{id}/text|html.",
    scope: "read:paginas",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Texto a buscar en path y título (case-insensitive)." },
        academia_id: { type: "string", description: "Filtrar por academia (UUID de list_academias)." },
        path: { type: "string", description: "Filtrar por path exacto, ej. /gestion/pagos." },
        limit: { type: "number", description: "Máximo de resultados (default 20, máx 100)." },
      },
      additionalProperties: false,
    },
    handler: async (args) => {
      const supa = supabaseAdmin();
      const academiaId = str(args.academia_id);
      const path = str(args.path);
      const query = str(args.query);
      const limit = clampNum(args.limit, 20, 100);

      let q;
      if (academiaId) {
        q = supa
          .from("paginas")
          .select(
            "id, crawl_id, path, full_url, route_name, title, http_status, captured_at, crawls!inner(academia_id)",
          )
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
      if (query) {
        const s = sanitizeForOr(query);
        if (s) q = q.or(`path.ilike.*${s}*,title.ilike.*${s}*`);
      }

      const { data, error } = await q;
      if (error) return fail(`db_error: ${error.message}`);
      return ok({ count: data?.length ?? 0, paginas: data });
    },
  },

  {
    name: "get_pagina",
    description:
      "Devuelve los metadatos completos de una página por id, más los URIs de recursos (vidroop://...) con su contenido (text/html/dom-tree/screenshot). El texto crudo NO se incluye acá: leelo vía el resource.",
    scope: "read:paginas",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "UUID de la página." } },
      required: ["id"],
      additionalProperties: false,
    },
    handler: async (args) => {
      const id = str(args.id);
      if (!id) return fail("Falta el parámetro 'id'.");
      const supa = supabaseAdmin();
      const { data, error } = await supa.from("paginas").select("*").eq("id", id).maybeSingle();
      if (error) return fail(`db_error: ${error.message}`);
      if (!data) return fail("Página no encontrada.");

      const { text_content, ...meta } = data;
      const resources = {
        text: data.text_content ? `vidroop://pagina/${id}/text` : null,
        html: data.html_path ? `vidroop://pagina/${id}/html` : null,
        dom_tree: data.dom_tree_path ? `vidroop://pagina/${id}/dom-tree` : null,
        screenshot: data.screenshot_path ? `vidroop://pagina/${id}/screenshot` : null,
      };
      return ok({
        pagina: { ...meta, text_content_length: text_content?.length ?? 0 },
        resources,
      });
    },
  },

  {
    name: "list_rutas",
    description:
      "Lista las rutas conocidas de una academia (el mapa del SPA). Usá dynamic_only=true para ver solo las dinámicas (con :id).",
    scope: "read:routes",
    inputSchema: {
      type: "object",
      properties: {
        academia_id: { type: "string", description: "UUID de la academia (de list_academias)." },
        dynamic_only: { type: "boolean", description: "Si es true, solo rutas dinámicas." },
      },
      required: ["academia_id"],
      additionalProperties: false,
    },
    handler: async (args) => {
      const academiaId = str(args.academia_id);
      if (!academiaId) return fail("Falta el parámetro 'academia_id'.");
      const supa = supabaseAdmin();
      let q = supa
        .from("rutas")
        .select("id, path_pattern, route_name, is_dynamic, meta, first_seen_at, last_seen_at, last_seen_crawl_id")
        .eq("academia_id", academiaId)
        .order("path_pattern", { ascending: true });
      if (args.dynamic_only === true) q = q.eq("is_dynamic", true);
      const { data, error } = await q;
      if (error) return fail(`db_error: ${error.message}`);
      return ok({ count: data?.length ?? 0, rutas: data });
    },
  },

  {
    name: "get_crawl_status",
    description:
      "Estado de un crawl. Pasá crawl_id para uno puntual, o academia_id para el último crawl de esa academia.",
    scope: "read:crawls",
    inputSchema: {
      type: "object",
      properties: {
        crawl_id: { type: "string", description: "UUID de un crawl puntual." },
        academia_id: { type: "string", description: "UUID de academia: devuelve su crawl más reciente." },
      },
      additionalProperties: false,
    },
    handler: async (args) => {
      const crawlId = str(args.crawl_id);
      const academiaId = str(args.academia_id);
      const supa = supabaseAdmin();

      if (crawlId) {
        const { data, error } = await supa.from("crawls").select("*").eq("id", crawlId).maybeSingle();
        if (error) return fail(`db_error: ${error.message}`);
        if (!data) return fail("Crawl no encontrado.");
        return ok({ crawl: data });
      }
      if (academiaId) {
        const { data, error } = await supa
          .from("crawls")
          .select("*")
          .eq("academia_id", academiaId)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) return fail(`db_error: ${error.message}`);
        if (!data) return fail("La academia todavía no tiene crawls.");
        return ok({ crawl: data, note: "Último crawl de la academia." });
      }
      return fail("Pasá 'crawl_id' o 'academia_id'.");
    },
  },

  {
    name: "trigger_crawl",
    description:
      "Encola un nuevo crawl de una academia (dispara el workflow de GitHub Actions). Falla si la academia está inactiva o ya hay un crawl en curso. Seguí el progreso con get_crawl_status.",
    scope: "trigger:crawl",
    inputSchema: {
      type: "object",
      properties: { academia_id: { type: "string", description: "UUID de la academia a crawlear." } },
      required: ["academia_id"],
      additionalProperties: false,
    },
    handler: async (args, ctx) => {
      const id = str(args.academia_id);
      if (!id) return fail("Falta el parámetro 'academia_id'.");
      const supa = supabaseAdmin();

      const { data: academia, error: aerr } = await supa
        .from("academias")
        .select("id, active")
        .eq("id", id)
        .maybeSingle();
      if (aerr) return fail(`db_error: ${aerr.message}`);
      if (!academia) return fail("Academia no encontrada.");
      if (!academia.active) return fail("La academia está inactiva.");

      const { data: pending } = await supa
        .from("crawls")
        .select("id, status")
        .eq("academia_id", id)
        .in("status", ["pending", "running"])
        .limit(1)
        .maybeSingle();
      if (pending) return fail(`Ya hay un crawl ${pending.status} en curso (id: ${pending.id}).`);

      const triggeredBy = `mcp:${ctx.label}`;
      const { data: crawl, error: cerr } = await supa
        .from("crawls")
        .insert({ academia_id: id, status: "pending", trigger: "mcp", triggered_by: triggeredBy })
        .select("id, status, started_at")
        .single();
      if (cerr || !crawl) return fail(`db_error: ${cerr?.message ?? "insert falló"}`);

      try {
        await triggerCrawlWorkflow({ crawl_id: crawl.id, academia_id: id, triggered_by: triggeredBy });
      } catch (e) {
        await supa
          .from("crawls")
          .update({
            status: "failed",
            ended_at: new Date().toISOString(),
            error_message: `Dispatch falló: ${e instanceof Error ? e.message : "unknown"}`,
          })
          .eq("id", crawl.id);
        return fail(`dispatch_failed: ${e instanceof Error ? e.message : "unknown"}`);
      }

      return ok({
        crawl,
        note: "Crawl encolado. Consultá get_crawl_status con este crawl_id para seguir el progreso.",
      });
    },
  },
];
