import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight">Vidroop Knowledge</h1>
          <p className="mt-2 text-zinc-400">
            Crawler + base de conocimiento + API para agentes IA.
          </p>
        </header>

        <section className="space-y-6">
          <div className="rounded-lg border border-zinc-800 p-6">
            <h2 className="text-lg font-semibold mb-2">¿Qué es?</h2>
            <p className="text-zinc-300 leading-relaxed">
              Plataforma que crawlea automáticamente Vidroop, almacena toda la
              documentación del producto en una base de datos versionada, y expone
              una API para que agentes de IA externos consulten información siempre
              actualizada.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 p-6">
            <h2 className="text-lg font-semibold mb-3">Arquitectura</h2>
            <ul className="space-y-2 text-zinc-300">
              <li>
                <span className="text-zinc-500">Crawler:</span> Playwright en GitHub
                Actions (cron diario)
              </li>
              <li>
                <span className="text-zinc-500">DB:</span> Supabase Postgres + Storage
              </li>
              <li>
                <span className="text-zinc-500">API + UI:</span> Next.js en Vercel
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-zinc-800 p-6">
            <h2 className="text-lg font-semibold mb-3">Endpoints API</h2>
            <pre className="text-sm bg-black/40 p-4 rounded overflow-x-auto">
{`GET    /api/v1/health
GET    /api/v1/academias
POST   /api/v1/academias
GET    /api/v1/academias/:id
GET    /api/v1/academias/:id/credenciales
POST   /api/v1/academias/:id/credenciales
GET    /api/v1/academias/:id/crawls
POST   /api/v1/academias/:id/crawls   (dispara workflow)
GET    /api/v1/academias/:id/rutas
GET    /api/v1/crawls/:id
GET    /api/v1/crawls/:id/paginas
GET    /api/v1/paginas?academia_id=...&path=...
GET    /api/v1/paginas/:id
GET    /api/v1/paginas/:id/html
GET    /api/v1/paginas/:id/screenshot
GET    /api/v1/paginas/:id/dom-tree
GET    /api/v1/paginas/:id/text`}
            </pre>
            <p className="mt-3 text-sm text-zinc-400">
              Auth via <code className="text-zinc-200">Authorization: Bearer vk_...</code>
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 p-6">
            <h2 className="text-lg font-semibold mb-3">Admin</h2>
            <Link
              href="/admin"
              className="inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 transition"
            >
              Ir al panel admin
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
