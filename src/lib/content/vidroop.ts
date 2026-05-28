/**
 * Acceso al conocimiento de Vidroop bundleado (notes/ → src/content/vidroop/data.ts).
 * Es la fuente de la "explicación de cómo funciona Vidroop" mientras la tabla
 * `documentos` queda parkeada para el normalizer.
 */

import { marked } from "marked";
import { VIDROOP_DOCS, type VidroopDoc } from "@/content/vidroop/data";

marked.setOptions({ gfm: true });

export type { VidroopDoc };

export function getDocs(): VidroopDoc[] {
  return [...VIDROOP_DOCS].sort((a, b) => a.orden - b.orden);
}

export function getDoc(slug: string): VidroopDoc | undefined {
  return VIDROOP_DOCS.find((d) => d.slug === slug);
}

export function getDocSlugs(): string[] {
  return VIDROOP_DOCS.map((d) => d.slug);
}

export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false });
}

export function totalTokens(): number {
  return VIDROOP_DOCS.reduce((acc, d) => acc + d.tokens, 0);
}
