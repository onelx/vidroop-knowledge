/**
 * Herramientas del agente normalizador de Vidroop.
 * Solo se usa server-side (route handler de /api/admin/agente).
 */

import Anthropic from "@anthropic-ai/sdk";
import { getDocs, getDoc } from "@/lib/content/vidroop";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Tipos de input por herramienta
// ---------------------------------------------------------------------------

type BuscarConocimientoInput = { consulta: string };
type LeerNotaInput = { slug: string };
type GuardarDocumentoInput = {
  titulo: string;
  area: string;
  slug: string;
  content_md: string;
  orden?: number;
};

// ---------------------------------------------------------------------------
// Implementaciones
// ---------------------------------------------------------------------------

async function buscarConocimiento(input: BuscarConocimientoInput): Promise<unknown> {
  const { consulta } = input;
  const palabras = consulta
    .toLowerCase()
    .split(/\s+/)
    .filter((p) => p.length > 2);

  const docs = getDocs();
  const resultados = docs
    .filter((doc) => {
      const haystack = `${doc.titulo} ${doc.area} ${doc.md}`.toLowerCase();
      return palabras.some((p) => haystack.includes(p));
    })
    .map((doc) => {
      // Encontrar el fragmento más relevante (máx 500 chars)
      const haystack = doc.md.toLowerCase();
      let mejor = 0;
      for (const p of palabras) {
        const idx = haystack.indexOf(p);
        if (idx !== -1 && idx < mejor + doc.md.length) {
          mejor = Math.max(0, idx - 100);
          break;
        }
      }
      const extracto = doc.md.slice(mejor, mejor + 500).trim();
      return { slug: doc.slug, titulo: doc.titulo, area: doc.area, extracto };
    });

  return resultados;
}

async function leerNota(input: LeerNotaInput): Promise<unknown> {
  const { slug } = input;
  const doc = getDoc(slug);
  if (!doc) {
    return { error: `No se encontró ninguna nota con slug '${slug}'.` };
  }
  return { slug: doc.slug, titulo: doc.titulo, area: doc.area, content_md: doc.md };
}

async function listarPaginasCrawl(): Promise<unknown> {
  const supa = supabaseAdmin();

  const { data, error } = await supa
    .from("paginas")
    .select(
      `
      path,
      title,
      text_content,
      crawls!inner (
        academia_id,
        academias!inner ( slug )
      )
    `,
    )
    .eq("http_status", 200)
    .not("text_content", "is", null)
    .order("text_content", { ascending: false })
    .limit(30);

  if (error) {
    return { error: error.message };
  }

  // Filtrar solo las de academiaia y calcular chars
  type RawPagina = {
    path: string;
    title: string | null;
    text_content: string | null;
    crawls: {
      academia_id: string;
      academias: { slug: string } | { slug: string }[];
    } | {
      academia_id: string;
      academias: { slug: string } | { slug: string }[];
    }[];
  };

  const rows = (data as RawPagina[])
    .filter((row) => {
      const crawl = Array.isArray(row.crawls) ? row.crawls[0] : row.crawls;
      if (!crawl) return false;
      const academia = Array.isArray(crawl.academias) ? crawl.academias[0] : crawl.academias;
      return academia?.slug === "academiaia";
    })
    .map((row) => ({
      path: row.path,
      title: row.title,
      chars: row.text_content?.length ?? 0,
    }))
    .sort((a, b) => b.chars - a.chars);

  return rows;
}

async function guardarDocumento(input: GuardarDocumentoInput): Promise<unknown> {
  const { titulo, area, slug, content_md, orden = 0 } = input;
  const supa = supabaseAdmin();

  // Obtener academia_id de academiaia
  const { data: academia, error: acadError } = await supa
    .from("academias")
    .select("id")
    .eq("slug", "academiaia")
    .single();

  if (acadError || !academia) {
    return { ok: false, error: acadError?.message ?? "Academia 'academiaia' no encontrada." };
  }

  const academia_id: string = academia.id;

  const { data, error } = await supa
    .from("documentos")
    .upsert(
      {
        academia_id,
        source: "normalizer" as const,
        slug,
        titulo,
        area,
        content_md,
        orden,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "academia_id,source,slug" },
    )
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, id: data?.id };
}

async function listarDocumentos(): Promise<unknown> {
  const supa = supabaseAdmin();

  const { data: academia, error: acadError } = await supa
    .from("academias")
    .select("id")
    .eq("slug", "academiaia")
    .single();

  if (acadError || !academia) {
    return { error: "Academia 'academiaia' no encontrada." };
  }

  const { data, error } = await supa
    .from("documentos")
    .select("id, slug, titulo, area, created_at")
    .eq("academia_id", academia.id)
    .eq("source", "normalizer")
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return data ?? [];
}

// ---------------------------------------------------------------------------
// Definiciones JSON Schema para la API de Anthropic
// ---------------------------------------------------------------------------

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "buscar_conocimiento",
    description:
      "Busca en los documentos bundleados de Vidroop por palabras clave. Retorna un array con slug, titulo, area y un extracto de hasta 500 caracteres del contenido relevante.",
    input_schema: {
      type: "object" as const,
      properties: {
        consulta: {
          type: "string",
          description: "Palabras clave a buscar (ej: 'producto precio cupón')",
        },
      },
      required: ["consulta"],
    },
  },
  {
    name: "leer_nota",
    description:
      "Retorna el content_md completo de un documento bundleado de Vidroop identificado por su slug.",
    input_schema: {
      type: "object" as const,
      properties: {
        slug: {
          type: "string",
          description: "Slug del documento (ej: '00-resumen-general')",
        },
      },
      required: ["slug"],
    },
  },
  {
    name: "listar_paginas_crawl",
    description:
      "Lista las páginas capturadas por el crawler para la academia 'academiaia' con estado HTTP 200 y contenido de texto, ordenadas por cantidad de caracteres (más densas primero). Máximo 30 resultados.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "guardar_documento",
    description:
      "Guarda (upsert) un artículo de documentación en la tabla `documentos` con source='normalizer'. Llamar SOLO cuando el usuario lo pida explícitamente.",
    input_schema: {
      type: "object" as const,
      properties: {
        titulo: { type: "string", description: "Título del artículo" },
        area: { type: "string", description: "Área temática (ej: Productos, Gestión, General)" },
        slug: {
          type: "string",
          description: "Slug único en minúsculas con guiones (ej: como-crear-producto)",
        },
        content_md: { type: "string", description: "Contenido del artículo en markdown" },
        orden: { type: "number", description: "Orden de aparición (entero, default 0)" },
      },
      required: ["titulo", "area", "slug", "content_md"],
    },
  },
  {
    name: "listar_documentos",
    description:
      "Lista todos los documentos ya guardados por el normalizador para la academia 'academiaia'. Retorna id, slug, titulo, area y created_at.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export async function executeTool(name: string, input: unknown): Promise<unknown> {
  switch (name) {
    case "buscar_conocimiento":
      return buscarConocimiento(input as BuscarConocimientoInput);
    case "leer_nota":
      return leerNota(input as LeerNotaInput);
    case "listar_paginas_crawl":
      return listarPaginasCrawl();
    case "guardar_documento":
      return guardarDocumento(input as GuardarDocumentoInput);
    case "listar_documentos":
      return listarDocumentos();
    default:
      return { error: `Herramienta desconocida: ${name}` };
  }
}
