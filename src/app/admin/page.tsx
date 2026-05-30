/**
 * Panel admin server-rendered. Server Component que lista academias y crawls recientes
 * directamente con el cliente service_role.
 *
 * Acceso protegido por HTTP Basic Auth en el proxy (src/proxy.ts).
 * El crawl se dispara a mano con el botón "Crawlear ahora" (ya no hay cron).
 */

import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import CrawlButton from "@/components/CrawlButton";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supa = supabaseAdmin();

  const [{ data: academias }, { data: crawls }] = await Promise.all([
    supa
      .from("academias")
      .select("id, slug, label, base_url, active, created_at")
      .order("created_at", { ascending: false }),
    supa
      .from("crawls")
      .select("id, academia_id, status, trigger, started_at, ended_at, pages_success, pages_failed, pages_changed, pages_unchanged")
      .order("started_at", { ascending: false })
      .limit(20),
  ]);

  // Crawl en curso (pending/running) por academia, para mostrar el botón Detener.
  const activeByAcademia = new Map<string, string>();
  for (const c of crawls ?? []) {
    if ((c.status === "pending" || c.status === "running") && !activeByAcademia.has(c.academia_id)) {
      activeByAcademia.set(c.academia_id, c.id);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <main className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin</h1>
            <p className="text-zinc-400">Academias registradas + crawls recientes</p>
          </div>
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-100">
            ← volver
          </Link>
        </header>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Academias</h2>
          {!academias || academias.length === 0 ? (
            <p className="text-zinc-500">
              No hay academias registradas todavía. Creá una vía API:{" "}
              <code className="text-zinc-300 bg-zinc-900 px-2 py-1 rounded text-xs">
                POST /api/v1/academias
              </code>
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900 text-zinc-400">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Label</th>
                    <th className="text-left px-4 py-2 font-medium">Slug</th>
                    <th className="text-left px-4 py-2 font-medium">URL</th>
                    <th className="text-left px-4 py-2 font-medium">Activa</th>
                    <th className="text-left px-4 py-2 font-medium">Creada</th>
                    <th className="text-left px-4 py-2 font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {academias.map((a) => (
                    <tr key={a.id} className="border-t border-zinc-800">
                      <td className="px-4 py-2 font-medium">{a.label}</td>
                      <td className="px-4 py-2 text-zinc-400">{a.slug}</td>
                      <td className="px-4 py-2 text-zinc-500 text-xs">{a.base_url}</td>
                      <td className="px-4 py-2">
                        {a.active ? (
                          <span className="text-emerald-400">✓</span>
                        ) : (
                          <span className="text-zinc-500">○</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-zinc-500 text-xs">
                        {new Date(a.created_at).toLocaleString("es-AR")}
                      </td>
                      <td className="px-4 py-2">
                        {a.active ? (
                          <CrawlButton
                            academiaId={a.id}
                            activeCrawlId={activeByAcademia.get(a.id) ?? null}
                          />
                        ) : (
                          <span className="text-zinc-600 text-xs">inactiva</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Crawls recientes</h2>
          {!crawls || crawls.length === 0 ? (
            <p className="text-zinc-500">Sin crawls todavía.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900 text-zinc-400">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">ID</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">Trigger</th>
                    <th className="text-left px-4 py-2 font-medium">Páginas (OK/Falló)</th>
                    <th className="text-left px-4 py-2 font-medium">Cambios</th>
                    <th className="text-left px-4 py-2 font-medium">Inicio</th>
                  </tr>
                </thead>
                <tbody>
                  {crawls.map((c) => (
                    <tr key={c.id} className="border-t border-zinc-800">
                      <td className="px-4 py-2 font-mono text-xs text-zinc-400">
                        {c.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-2 text-zinc-400">{c.trigger}</td>
                      <td className="px-4 py-2 text-xs">
                        <span className="text-emerald-400">{c.pages_success}</span>
                        {" / "}
                        <span className="text-rose-400">{c.pages_failed}</span>
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <span className="text-amber-400" title="cambiaron">✚ {c.pages_changed}</span>
                        {" / "}
                        <span className="text-zinc-500" title="sin cambios">= {c.pages_unchanged}</span>
                      </td>
                      <td className="px-4 py-2 text-zinc-500 text-xs">
                        {new Date(c.started_at).toLocaleString("es-AR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = {
    completed: "text-emerald-400 bg-emerald-950/40",
    running: "text-blue-400 bg-blue-950/40",
    pending: "text-yellow-400 bg-yellow-950/40",
    partial: "text-amber-400 bg-amber-950/40",
    failed: "text-rose-400 bg-rose-950/40",
    cancelled: "text-zinc-300 bg-zinc-800",
  }[status] ?? "text-zinc-400 bg-zinc-900";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
