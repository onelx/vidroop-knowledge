/**
 * Rate-limit best-effort por IP en memoria. En Vercel (serverless, multi-instancia)
 * no es global, pero acota el abuso por instancia. Combinado con el tope de
 * max_tokens y el largo de historial, mantiene el costo bajo control.
 */

const WINDOW_MS = 10 * 60 * 1000; // 10 min
const MAX_REQ = 20;

const hits = new Map<string, number[]>();

export function checkRateLimit(ip: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const prev = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);

  if (prev.length >= MAX_REQ) {
    hits.set(ip, prev);
    const retryAfter = Math.ceil((WINDOW_MS - (now - prev[0])) / 1000);
    return { ok: false, retryAfter };
  }

  prev.push(now);
  hits.set(ip, prev);

  // Limpieza ocasional para no crecer sin límite.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return { ok: true };
}
