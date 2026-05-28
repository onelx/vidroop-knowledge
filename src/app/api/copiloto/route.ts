/**
 * Copiloto de Vidroop — chat sobre la base de conocimiento.
 *
 *   POST /api/copiloto  body: { messages: [{role:'user'|'assistant', content:string}] }
 *   → { reply: string }
 *
 * Usa Claude Haiku 4.5 con la KB completa en un system prompt cacheado
 * (cache_control ephemeral). Público con rate-limit por IP + topes de costo.
 */

import Anthropic from "@anthropic-ai/sdk";
import { json, jsonError } from "@/lib/api/utils";
import { buildSystemPrompt } from "@/lib/copiloto/system-prompt";
import { checkRateLimit } from "@/lib/copiloto/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 2048;
const MAX_HISTORY = 12; // últimos N mensajes que mandamos al modelo
const MAX_CONTENT_CHARS = 4000;

type ChatMsg = { role: "user" | "assistant"; content: string };

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function parseMessages(body: unknown): ChatMsg[] | null {
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
  // Quedarnos con los últimos N y arrancar siempre en un turno 'user'.
  let trimmed = msgs.slice(-MAX_HISTORY);
  while (trimmed.length && trimmed[0].role !== "user") trimmed = trimmed.slice(1);
  return trimmed.length ? trimmed : null;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonError(503, "not_configured", "El copiloto todavía no está configurado (falta ANTHROPIC_API_KEY).");
  }

  const rl = checkRateLimit(clientIp(request));
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: { code: "rate_limited", message: "Demasiadas consultas. Probá en unos minutos." } }),
      { status: 429, headers: { "content-type": "application/json", "retry-after": String(rl.retryAfter ?? 60) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Body no es JSON válido");
  }

  const messages = parseMessages(body);
  if (!messages) {
    return jsonError(400, "invalid_messages", "Mandá 'messages': [{role, content}] con al menos un turno de usuario.");
  }

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: "text",
          text: buildSystemPrompt(),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    });

    const reply = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    console.log(
      `[copiloto] in=${message.usage.input_tokens} cache_read=${message.usage.cache_read_input_tokens ?? 0} cache_write=${message.usage.cache_creation_input_tokens ?? 0} out=${message.usage.output_tokens}`,
    );

    return json({ reply: reply || "(sin respuesta)" });
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
