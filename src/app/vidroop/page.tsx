/**
 * Explicación de cómo funciona Vidroop. Índice de los documentos (notes humanas
 * bundleadas) agrupados por área, más stats vivas del último crawl desde la DB.
 */

import Link from "next/link";
import { getDocs } from "@/lib/content/vidroop";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function getStats() {
  const supa = supabaseAdmin();
  const { data: academia } = await supa
    .from("academias")
    .select("id, label, base_url")
    .eq("slug", "academiaia")
    .maybeSingle();

  let pages = 0;
  let lastCrawl: string | null = null;
  if (academia) {
    const { data: crawl } = await supa
      .from("crawls")
      .select("id, ended_at, pages_success")
      .eq("academia_id", academia.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (crawl) {
      pages = crawl.pages_success ?? 0;
      lastCrawl = crawl.ended_at;
    }
  }
  return { academia, pages, lastCrawl };
}

export default async function VidroopIndex() {
  const docs = getDocs();
  const { academia, pages, lastCrawl } = await getStats();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <header className="mb-10">
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-100">
            ← inicio
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Cómo funciona Vidroop</h1>
          <p className="mt-2 text-zinc-400">
            Explicación completa de la plataforma {academia?.label ? `(${academia.label})` : ""},
            derivada de la auditoría y del crawl automático.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-500">
            <span>{docs.length} áreas documentadas</span>
            <span>·</span>
            <span>{pages} páginas crawleadas</span>
            {lastCrawl && (
              <>
                <span>·</span>
                <span>último crawl {new Date(lastCrawl).toLocaleDateString("es-AR")}</span>
              </>
            )}
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          {docs.map((d) => (
            <Link
              key={d.slug}
              href={`/vidroop/${d.slug}`}
              className="group rounded-lg border border-zinc-800 p-5 hover:border-emerald-600/60 hover:bg-zinc-900/40 transition"
            >
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-500/80">
                {d.area}
              </div>
              <div className="mt-1 font-semibold group-hover:text-emerald-300">{d.titulo}</div>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900/30 p-5 text-sm text-zinc-400">
          ¿Querés preguntar en lenguaje natural?{" "}
          <Link href="/copiloto" className="text-emerald-400 underline hover:text-emerald-300">
            Probá el copiloto de Vidroop →
          </Link>
        </div>
      </main>
    </div>
  );
}
