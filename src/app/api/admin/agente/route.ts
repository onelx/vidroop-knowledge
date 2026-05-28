/**
 * Agente normalizador de Vidroop — herramienta interna.
 *
 *   POST /api/admin/agente  body: { messages: [{role, content}] }
 *   → { reply: string }
 *
 * Loop de tool use con Anthropic SDK. Máximo 10 rondas.
 * Sin rate limit (uso interno exclusivo del dueño del sistema).
 */

import Anthropic from "@anthropic-ai/sdk";
import { json, jsonError } from "@/lib/api/utils";
import { TOOLS, executeTool } from "@/lib/admin/normalizer-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4096;
const MAX_ROUNDS = 10;
const MAX_CONTENT_CHARS = 8000;

const SYSTEM_PROMPT = `Sos el agente normalizador de Vidroop. Creás artículos de documentación para el help desk usando EXCLUSIVAMENTE información de las herramientas disponibles.

REGLAS:
1. NUNCA inventés rutas, funciones, precios ni comportamientos que no estén en las herramientas.
2. Antes de redactar, usá buscar_conocimiento para encontrar info relevante.
3. Mostrá el artículo redactado en formato markdown limpio.
4. Solo llamás guardar_documento cuando el usuario lo pida explícitamente (palabras como "guardar", "ok guardá", "guardalo").
5. Si la info no está disponible, decilo claramente.

El usuario te indica el tono (formal/simple/técnico) y el alcance. Los artículos usan markdown: # título, ## secciones, pasos numerados.`;

type ChatMsg = { role: "user" | "assistant"; content: string };

function parseBody(body: unknown): ChatMsg[] | null {
  if (!body || typeof body !== "object" || !Array.isArray((body as { messages?: unknown }).messages)) {
    return null;
  }
  const raw = (body as { messages: unknown[] }).messages;
  const msgs: ChatMsg[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const trimmed = content.trim();
    if (!trimmed) continue;
    msgs.push({ role, content: trimmed.slice(0, MAX_CONTENT_CHARS) });
  }
  // Debe empezar en un turno de usuario
  let cleaned = msgs;
  while (cleaned.length && cleaned[0].role !== "user") cleaned = cleaned.slice(1);
  if (!cleaned.length) return null;
  return cleaned;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonError(503, "not_configured", "ANTHROPIC_API_KEY no está configurada.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Body no es JSON válido");
  }

  const messages = parseBody(body);
  if (!messages) {
    return jsonError(400, "invalid_messages", "Mandá 'messages': [{role, content}] con al menos un turno de usuario.");
  }

  const client = new Anthropic({ apiKey });

  // Convertir ChatMsg a MessageParam para el SDK
  const conversation: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let rounds = 0;
  let finalReply = "";

  try {
    while (rounds < MAX_ROUNDS) {
      rounds++;

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: conversation,
      });

      console.log(
        `[agente] ronda=${rounds} stop=${response.stop_reason} in=${response.usage.input_tokens} out=${response.usage.output_tokens}`,
      );

      // Agregar respuesta del asistente al historial
      conversation.push({ role: "assistant", content: response.content });

      // Si no hay tool_use o llegamos a end_turn, terminamos
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );

      if (response.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
        // Extraer texto final
        finalReply = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("")
          .trim();
        break;
      }

      // Ejecutar todas las herramientas solicitadas
      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (toolUse) => {
          console.log(`[agente] tool=${toolUse.name} id=${toolUse.id}`);
          let result: unknown;
          try {
            result = await executeTool(toolUse.name, toolUse.input);
          } catch (e) {
            result = { error: e instanceof Error ? e.message : "Error desconocido al ejecutar herramienta" };
          }
          return {
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          };
        }),
      );

      // Agregar resultados al historial y continuar el loop
      conversation.push({ role: "user", content: toolResults });
    }

    if (!finalReply) {
      finalReply = "(El agente no generó una respuesta de texto.)";
    }

    return json({ reply: finalReply });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return jsonError(429, "upstream_rate_limit", "El modelo está saturado. Probá de nuevo en un momento.");
    }
    if (e instanceof Anthropic.AuthenticationError) {
      return jsonError(503, "auth_error", "La API key de Anthropic no es válida.");
    }
    if (e instanceof Anthropic.APIError) {
      return jsonError(502, "upstream_error", `Error del modelo: ${e.message}`);
    }
    return jsonError(500, "internal", e instanceof Error ? e.message : "Error desconocido");
  }
}
