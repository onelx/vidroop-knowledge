/**
 * Dispatcher MCP sobre JSON-RPC 2.0 (transporte Streamable HTTP, stateless).
 *
 * Implementa el subconjunto del protocolo necesario para un server de solo
 * lectura + una tool de trigger: initialize, ping, tools/*, resources/*.
 * No mantiene sesión (no usa Mcp-Session-Id); cada request es independiente.
 *
 * Spec: https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
 */

import { McpError } from "./errors";
import { RESOURCE_TEMPLATES, readResource } from "./resources";
import { TOOLS } from "./tools";

const SERVER_INFO = { name: "vidroop-knowledge", version: "0.1.0" };
const SUPPORTED_PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const LATEST_PROTOCOL = "2025-06-18";

const INSTRUCTIONS =
  "Base de conocimiento viva de Vidroop (SaaS de academias online). " +
  "Flujo típico: list_academias para obtener un academia_id → list_rutas / search_paginas para explorar → " +
  "get_pagina + los resources vidroop://pagina/{id}/text|html para el contenido. " +
  "trigger_crawl fuerza un re-crawl; get_crawl_status sigue su progreso.";

export type RpcContext = { scopes: string[]; label: string };

export type JsonRpcMessage = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: unknown;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

/**
 * Procesa un mensaje JSON-RPC. Devuelve la respuesta a enviar, o null si el
 * mensaje es una notificación / respuesta del cliente (no requiere reply).
 */
export async function handleMessage(
  msg: JsonRpcMessage,
  ctx: RpcContext,
): Promise<JsonRpcResponse | null> {
  // Sin `method` es una respuesta del cliente → no hay nada que contestar.
  if (typeof msg.method !== "string") return null;

  const isNotification = !("id" in msg) || msg.id === undefined;
  const id = msg.id ?? null;

  try {
    const result = await dispatch(msg.method, msg.params ?? {}, ctx);
    if (isNotification) return null;
    return { jsonrpc: "2.0", id, result };
  } catch (e) {
    if (isNotification) return null;
    if (e instanceof McpError) {
      return { jsonrpc: "2.0", id, error: { code: e.code, message: e.message, data: e.data } };
    }
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32603, message: e instanceof Error ? e.message : "Internal error" },
    };
  }
}

async function dispatch(
  method: string,
  params: Record<string, unknown>,
  ctx: RpcContext,
): Promise<unknown> {
  switch (method) {
    case "initialize": {
      const requested = typeof params.protocolVersion === "string" ? params.protocolVersion : LATEST_PROTOCOL;
      const protocolVersion = SUPPORTED_PROTOCOLS.includes(requested) ? requested : LATEST_PROTOCOL;
      return {
        protocolVersion,
        capabilities: { tools: {}, resources: {} },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      };
    }

    // Notificaciones del cliente: no devuelven resultado (handleMessage las descarta).
    case "notifications/initialized":
    case "notifications/cancelled":
      return null;

    case "ping":
      return {};

    case "tools/list":
      return {
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      };

    case "tools/call": {
      const name = typeof params.name === "string" ? params.name : "";
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) throw new McpError(-32602, `Tool desconocida: ${name || "(vacío)"}`);
      if (!ctx.scopes.includes(tool.scope)) {
        return { content: [{ type: "text", text: `Falta scope: ${tool.scope}` }], isError: true };
      }
      return await tool.handler(args, { label: ctx.label });
    }

    case "resources/list":
      // Los artefactos se exponen vía templates (no enumeramos cada página).
      return { resources: [] };

    case "resources/templates/list":
      return { resourceTemplates: RESOURCE_TEMPLATES };

    case "resources/read": {
      if (!ctx.scopes.includes("read:paginas")) {
        throw new McpError(-32602, "Falta scope: read:paginas");
      }
      const uri = typeof params.uri === "string" ? params.uri : "";
      if (!uri) throw new McpError(-32602, "Falta el parámetro 'uri'.");
      const contents = await readResource(uri);
      return { contents };
    }

    default:
      throw new McpError(-32601, `Método no soportado: ${method}`);
  }
}
