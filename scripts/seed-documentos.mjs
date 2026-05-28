/**
 * Siembra la tabla `documentos` (source='notes') desde notes/NN-*.md.
 *
 * notes/ es la auditoría humana de Vidroop (vive fuera del repo, en el dir
 * hermano). Esto la mete en la DB para que la sirva la página de explicación
 * y la use el copiloto como contexto.
 *
 * Uso:
 *   node scripts/seed-documentos.mjs
 *   NOTES_DIR=/ruta/a/notes ACADEMIA_SLUG=academiaia node scripts/seed-documentos.mjs
 *
 * Lee SUPABASE_URL/SERVICE_ROLE de .env.local (o del environment). Idempotente:
 * upsert por (academia_id, source, slug).
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function loadEnvLocal() {
  const p = resolve(repoRoot, ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NOTES_DIR = process.env.NOTES_DIR ?? resolve(repoRoot, "..", "notes");
const ACADEMIA_SLUG = process.env.ACADEMIA_SLUG ?? "academiaia";

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!existsSync(NOTES_DIR)) {
  console.error(`No existe NOTES_DIR: ${NOTES_DIR}`);
  process.exit(1);
}

// Solo los docs de dominio Vidroop (00–10). 11 es sobre esta plataforma; README es índice.
const AREA_BY_PREFIX = {
  "00": "General",
  "01": "Arquitectura",
  "02": "Academia",
  "03": "Gestión",
  "04": "Mi Cuenta",
  "05": "Formaciones y Cursos",
  "06": "Productos",
  "07": "Páginas utilitarias",
  "08": "Integraciones",
  "09": "Bugs y hallazgos",
  "10": "API",
};

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE,
      authorization: `Bearer ${SERVICE_ROLE}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${text}`);
  return text ? JSON.parse(text) : null;
}

function firstHeading(md, fallback) {
  const m = /^#\s+(.+)$/m.exec(md);
  return m ? m[1].trim() : fallback;
}

async function main() {
  const academias = await rest(`academias?slug=eq.${ACADEMIA_SLUG}&select=id`);
  if (!academias?.length) throw new Error(`No encontré academia slug=${ACADEMIA_SLUG}`);
  const academiaId = academias[0].id;

  const files = readdirSync(NOTES_DIR)
    .filter((f) => /^\d{2}-.*\.md$/.test(f))
    .filter((f) => AREA_BY_PREFIX[f.slice(0, 2)] !== undefined)
    .sort();

  const rows = files.map((file) => {
    const prefix = file.slice(0, 2);
    const md = readFileSync(resolve(NOTES_DIR, file), "utf8");
    const slug = file.replace(/\.md$/, "");
    return {
      academia_id: academiaId,
      source: "notes",
      slug,
      titulo: firstHeading(md, slug),
      area: AREA_BY_PREFIX[prefix],
      source_path: `notes/${file}`,
      content_md: md,
      orden: Number(prefix),
      tokens: Math.ceil(md.length / 4),
    };
  });

  await rest("documentos?on_conflict=academia_id,source,slug", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });

  console.log(`Sembrados ${rows.length} documentos para academia ${ACADEMIA_SLUG}:`);
  for (const r of rows) console.log(`  [${String(r.orden).padStart(2, "0")}] ${r.titulo}  (${r.tokens} tok)`);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
