/**
 * Genera src/content/vidroop/data.ts desde notes/NN-*.md (la auditoría humana).
 *
 * Bundlea las notes dentro de la app para servir la "explicación de Vidroop"
 * sin depender de la DB (notes/ vive fuera del repo y Vercel no lo deploya).
 * Re-correr cuando cambien las notes:  node scripts/gen-vidroop-content.mjs
 */

import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const NOTES_DIR = process.env.NOTES_DIR ?? resolve(repoRoot, "..", "notes");
const OUT = resolve(repoRoot, "src/content/vidroop/data.ts");

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

if (!existsSync(NOTES_DIR)) {
  console.error(`No existe NOTES_DIR: ${NOTES_DIR}`);
  process.exit(1);
}

const firstHeading = (md, fallback) => {
  const m = /^#\s+(.+)$/m.exec(md);
  if (!m) return fallback;
  // Saca el prefijo "NN — " / "NN. " del encabezado para un título limpio.
  return m[1].trim().replace(/^\d{1,2}\s*[—–.\-:]\s*/, "");
};

const files = readdirSync(NOTES_DIR)
  .filter((f) => /^\d{2}-.*\.md$/.test(f) && AREA_BY_PREFIX[f.slice(0, 2)] !== undefined)
  .sort();

const docs = files.map((file) => {
  const md = readFileSync(resolve(NOTES_DIR, file), "utf8");
  const slug = file.replace(/\.md$/, "");
  return {
    slug,
    titulo: firstHeading(md, slug),
    area: AREA_BY_PREFIX[file.slice(0, 2)],
    orden: Number(file.slice(0, 2)),
    tokens: Math.ceil(md.length / 4),
    md,
  };
});

const header = `// AUTO-GENERADO por scripts/gen-vidroop-content.mjs — NO editar a mano.
// Fuente: notes/NN-*.md (auditoría humana de Vidroop). Re-generar: node scripts/gen-vidroop-content.mjs

export type VidroopDoc = {
  slug: string;
  titulo: string;
  area: string;
  orden: number;
  tokens: number;
  md: string;
};

export const VIDROOP_DOCS: VidroopDoc[] = ${JSON.stringify(docs, null, 2)};
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, header, "utf8");
console.log(`Generado ${OUT} con ${docs.length} docs (${docs.reduce((a, d) => a + d.tokens, 0)} tokens aprox):`);
for (const d of docs) console.log(`  [${String(d.orden).padStart(2, "0")}] ${d.area} — ${d.titulo}`);
