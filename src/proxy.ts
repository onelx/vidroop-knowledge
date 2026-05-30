/**
 * Proxy (ex-"middleware" — renombrado en Next 16) — gate de autenticación.
 *
 * Protege el panel admin y sus endpoints, que NO deben ser públicos:
 *   - /admin/*        (UI: panel + agente normalizador)
 *   - /api/admin/*    (POST /api/admin/agente ejecuta Claude con la API key del dueño)
 *
 * Usa HTTP Basic Auth: el navegador muestra el prompt nativo y reenvía las
 * credenciales en cada request del mismo origen (incluido el fetch del agente),
 * así no hace falta UI de login.
 *
 * Fail-closed: si ADMIN_PASSWORD no está configurada, deniega TODO. Nunca abre.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

const REALM = "Vidroop Knowledge Admin";

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"` },
  });
}

/** Comparación de tiempo constante a prueba de longitudes distintas. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Igual corremos timingSafeEqual contra sí mismo para no filtrar la longitud por timing.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function proxy(request: NextRequest): NextResponse {
  const expectedUser = process.env.ADMIN_USER || "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD;

  // Fail-closed: sin password configurada, el admin queda cerrado.
  if (!expectedPassword) {
    return new NextResponse("Admin no configurado (falta ADMIN_PASSWORD).", {
      status: 503,
    });
  }

  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) {
    return unauthorized();
  }

  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  } catch {
    return unauthorized();
  }

  const sep = decoded.indexOf(":");
  if (sep === -1) {
    return unauthorized();
  }
  const user = decoded.slice(0, sep);
  const password = decoded.slice(sep + 1);

  const ok = safeEqual(user, expectedUser) && safeEqual(password, expectedPassword);
  if (!ok) {
    return unauthorized();
  }

  return NextResponse.next();
}
