/**
 * Helpers comunes para las route handlers de la API.
 */

export type ApiError = { code: string; message: string; details?: unknown };

export function json<T>(data: T, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
}

export function jsonError(status: number, code: string, message: string, details?: unknown): Response {
  const body: { error: ApiError } = { error: { code, message } };
  if (details !== undefined) body.error.details = details;
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Paginación cursor-based. Cursor = base64(JSON({ts, id})).
 */
export function encodeCursor(payload: { ts: string; id: string }): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeCursor(cursor: string | null): { ts: string; id: string } | null {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function clampLimit(raw: string | null, defaultLimit = 50, maxLimit = 200): number {
  const n = Number(raw ?? defaultLimit);
  if (!Number.isFinite(n) || n < 1) return defaultLimit;
  return Math.min(Math.floor(n), maxLimit);
}
