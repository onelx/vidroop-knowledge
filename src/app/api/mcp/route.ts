/**
 * MCP server endpoint (Streamable HTTP, stateless).
 *
 *   POST /api/mcp   → mensajes JSON-RPC (initialize, tools/*, resources/*, ...)
 *   GET  /api/mcp   → 405 (no ofrecemos stream SSE server→cliente)
 *
 * Auth: misma API key que la REST (Authorization: Bearer vk_...). Cada tool
 * valida su scope dentro del dispatcher.
 */

import { requireApiKey } from "@/lib/auth/api-key";
import { handleMessage, type JsonRpcMessage } from "@/lib/mcp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(): Promise<Response> {
  return json(
    {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32601, message: "GET no soportado (server stateless). Usá POST con JSON-RPC." },
    },
    405,
  );
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireApiKey(request, []);
  if (!auth.ok) {
    const headers = new Headers(auth.response.headers);
    for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
    return new Response(auth.response.body, { status: auth.response.status, headers });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error: body no es JSON." } }, 400);
  }

  const ctx = { scopes: auth.key.scopes, label: auth.key.label };

  // JSON-RPC batch (array) o mensaje único.
  if (Array.isArray(body)) {
    const responses = [];
    for (const msg of body) {
      const r = await handleMessage(msg as JsonRpcMessage, ctx);
      if (r) responses.push(r);
    }
    if (responses.length === 0) return new Response(null, { status: 202, headers: CORS });
    return json(responses);
  }

  const r = await handleMessage(body as JsonRpcMessage, ctx);
  if (!r) return new Response(null, { status: 202, headers: CORS });
  return json(r);
}
