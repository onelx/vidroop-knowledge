/**
 * MCP resources: exponen los artefactos crudos de cada página crawleada.
 *
 * URI scheme:  vidroop://pagina/{id}/{text|html|dom-tree|screenshot}
 *   - text       → text_content (columna en DB)
 *   - html       → html_path en Storage (text/html)
 *   - dom-tree   → dom_tree_path en Storage (application/json)
 *   - screenshot → screenshot_path en Storage (image/png, devuelto como blob base64)
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { McpError } from "./errors";

export type ResourceTemplate = {
  uriTemplate: string;
  name: string;
  description: string;
  mimeType: string;
};

export const RESOURCE_TEMPLATES: ResourceTemplate[] = [
  {
    uriTemplate: "vidroop://pagina/{id}/text",
    name: "Texto de página",
    description: "Texto plano extraído de una página crawleada.",
    mimeType: "text/plain",
  },
  {
    uriTemplate: "vidroop://pagina/{id}/html",
    name: "HTML de página",
    description: "HTML crudo capturado de una página.",
    mimeType: "text/html",
  },
  {
    uriTemplate: "vidroop://pagina/{id}/dom-tree",
    name: "DOM tree de página",
    description: "Snapshot JSON del DOM de una página.",
    mimeType: "application/json",
  },
  {
    uriTemplate: "vidroop://pagina/{id}/screenshot",
    name: "Screenshot de página",
    description: "Captura PNG de una página (blob base64).",
    mimeType: "image/png",
  },
];

const STORAGE_ARTIFACTS = {
  html: { column: "html_path", mimeType: "text/html" },
  "dom-tree": { column: "dom_tree_path", mimeType: "application/json" },
  screenshot: { column: "screenshot_path", mimeType: "image/png" },
} as const;

type StorageArtifact = keyof typeof STORAGE_ARTIFACTS;

export type ResourceContent =
  | { uri: string; mimeType: string; text: string }
  | { uri: string; mimeType: string; blob: string };

const URI_RE = /^vidroop:\/\/pagina\/([^/]+)\/(text|html|dom-tree|screenshot)$/;

export async function readResource(uri: string): Promise<ResourceContent[]> {
  const m = URI_RE.exec(uri);
  if (!m) throw new McpError(-32602, `URI de recurso no soportada: ${uri}`);
  const id = m[1];
  const artifact = m[2];
  const supa = supabaseAdmin();

  if (artifact === "text") {
    const { data, error } = await supa.from("paginas").select("text_content").eq("id", id).maybeSingle();
    if (error) throw new McpError(-32603, `db_error: ${error.message}`);
    if (!data?.text_content) throw new McpError(-32602, "Esta página no tiene texto almacenado.");
    return [{ uri, mimeType: "text/plain", text: data.text_content }];
  }

  const meta = STORAGE_ARTIFACTS[artifact as StorageArtifact];
  const { data: pagina, error: perr } = await supa
    .from("paginas")
    .select(meta.column)
    .eq("id", id)
    .maybeSingle();
  if (perr) throw new McpError(-32603, `db_error: ${perr.message}`);
  if (!pagina) throw new McpError(-32602, "Página no encontrada.");

  const path = (pagina as Record<string, string | null>)[meta.column];
  if (!path) throw new McpError(-32602, `La página no tiene ${artifact}.`);

  const { data: blob, error: serr } = await supa.storage.from("crawl-artifacts").download(path);
  if (serr || !blob) throw new McpError(-32603, `storage_error: ${serr?.message ?? "download falló"}`);

  const buf = Buffer.from(await blob.arrayBuffer());
  if (artifact === "screenshot") {
    return [{ uri, mimeType: meta.mimeType, blob: buf.toString("base64") }];
  }
  return [{ uri, mimeType: meta.mimeType, text: buf.toString("utf8") }];
}
