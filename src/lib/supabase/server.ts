/**
 * Supabase client server-side con cookies (para Server Components y Route Handlers
 * cuando hay un usuario autenticado vía Supabase Auth).
 *
 * En Next.js 16 `cookies()` es async — siempre await.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll desde un Server Component es un no-op (no se pueden setear cookies ahí).
            // Está bien si hay middleware que refresca la sesión.
          }
        },
      },
    },
  );
}
