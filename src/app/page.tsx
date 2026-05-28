/**
 * Home / menú principal. Tarjetas de navegación + stats vivas del crawl (DB).
 */

import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getDocs } from "@/lib/content/vidroop";

export const dynamic = "force-dynamic";

async function getStats() {
  const supa = supabaseAdmin();
  const { data: academia } = await supa
    .from("academias")
    .select("id, label")
    .eq("slug", "academiaia")
    .maybeSingle();

  let pages = 0;
  let rutas = 0;
  let lastCrawl: string | null = null;
  if (academia) {
    const [{ count: rutasCount }, { data: crawl }] = await Promise.all([
      supa.from("rutas").select("id", { count: "exact", head: true }).eq("academia_id", academia.id),
      supa
        .from("crawls")
        .select("ended_at, pages_success")
        .eq("academia_id", academia.id)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    rutas = rutasCount ?? 0;
    if (crawl) {
      pages = crawl.pages_success ?? 0;
      lastCrawl = crawl.ended_at;
    }
  }
  return { academia, pages, rutas, lastCrawl };
}

export default async function Home() {
  const { academia, pages, rutas, lastCrawl } = await getStats();
  const areas = getDocs().length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <main className="mx-auto max-w-4xl px-6 py-16">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">Vidroop Knowledge</h1>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Base de conocimiento viva de Vidroop: crawleamos la plataforma, la guardamos
            versionada y la explicamos. Para personas y para agentes IA.
          </p>
        </header>

        <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Áreas" value={areas} />
          <Stat label="Rutas" value={rutas} />
          <Stat label="Páginas" value={pages} />
          <Stat
            label="Último crawl"
            value={lastCrawl ? new Date(lastCrawl).toLocaleDateString("es-AR") : "—"}
            small
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Card
            href="/vidroop"
            title="Cómo funciona Vidroop"
            desc="Explicación detallada de toda la plataforma, área por área: academia, gestión, productos, integraciones, bugs y más."
            cta="Explorar →"
            primary
          />
          <Card
            title="Copiloto IA"
            desc="Preguntá en lenguaje natural sobre cómo funciona Vidroop. Responde tomando todo el conocimiento de la base."
            badge="pronto"
          />
          <Card
            href="/admin"
            title="Explorar el crawl"
            desc="Academias registradas y crawls recientes con su estado (páginas OK / fallidas)."
            cta="Ver datos →"
          />
          <Card
            href="/vidroop/10-api-endpoints"
            title="API + MCP para agentes"
            desc="REST en /api/v1 y un MCP server en /api/mcp. Auth con Bearer vk_…. Pensado para que otros agentes consuman el conocimiento."
            cta="Ver endpoints →"
          />
        </section>

        <footer className="mt-12 text-sm text-zinc-600">
          Target actual: {academia?.label ?? "Vidroop"}. Crawler diario vía GitHub Actions ·
          Supabase + Vercel.
        </footer>
      </main>
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
      <div className={`font-bold text-zinc-100 ${small ? "text-lg" : "text-2xl"}`}>{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">{label}</div>
    </div>
  );
}

function Card({
  href,
  title,
  desc,
  cta,
  badge,
  primary,
}: {
  href?: string;
  title: string;
  desc: string;
  cta?: string;
  badge?: string;
  primary?: boolean;
}) {
  const base = `rounded-xl border p-6 transition ${
    primary
      ? "border-emerald-700/50 bg-emerald-950/20"
      : "border-zinc-800 bg-zinc-900/20"
  }`;
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {badge && (
          <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{badge}</span>
        )}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{desc}</p>
      {cta && href && (
        <span className="mt-4 inline-block text-sm font-medium text-emerald-400">{cta}</span>
      )}
    </>
  );

  if (!href) return <div className={`${base} opacity-70`}>{inner}</div>;
  return (
    <Link href={href} className={`${base} block hover:border-emerald-600/60 hover:bg-zinc-900/50`}>
      {inner}
    </Link>
  );
}
