/**
 * Render de un documento de Vidroop (markdown → HTML). Contenido estático
 * bundleado, así que se prerenderiza en build (generateStaticParams).
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { getDoc, getDocs, getDocSlugs, renderMarkdown } from "@/lib/content/vidroop";

export function generateStaticParams() {
  return getDocSlugs().map((slug) => ({ slug }));
}

export default async function VidroopDoc({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();

  const docs = getDocs();
  const idx = docs.findIndex((d) => d.slug === slug);
  const prev = idx > 0 ? docs[idx - 1] : null;
  const next = idx < docs.length - 1 ? docs[idx + 1] : null;
  const html = renderMarkdown(doc.md);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <nav className="mb-8 flex items-center gap-2 text-sm text-zinc-400">
          <Link href="/" className="hover:text-zinc-100">
            inicio
          </Link>
          <span className="text-zinc-600">/</span>
          <Link href="/vidroop" className="hover:text-zinc-100">
            Vidroop
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-300">{doc.area}</span>
        </nav>

        <article className="md-body" dangerouslySetInnerHTML={{ __html: html }} />

        <div className="mt-12 flex justify-between gap-4 border-t border-zinc-800 pt-6 text-sm">
          {prev ? (
            <Link href={`/vidroop/${prev.slug}`} className="text-zinc-400 hover:text-emerald-300">
              ← {prev.titulo}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/vidroop/${next.slug}`} className="text-right text-zinc-400 hover:text-emerald-300">
              {next.titulo} →
            </Link>
          ) : (
            <span />
          )}
        </div>
      </main>
    </div>
  );
}
