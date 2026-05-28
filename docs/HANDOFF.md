# HANDOFF — Vidroop Knowledge Platform

> Documento para abrir y continuar el proyecto en una sesión nueva.
> Última sesión: **2026-05-28**. Estado: **MVP en prod + MCP server (Etapa A) + UI pública (menú, explicación de Vidroop) + Copiloto IA, todo deployado.**

---

## 1. La idea (qué es y por qué)

**Vidroop Knowledge** es una plataforma que:

1. Se loguea automáticamente a **Vidroop** (un SaaS de academias online tipo Hotmart/Kajabi del que el usuario es cliente).
2. **Crawlea** toda la plataforma (recorre todas las rutas, captura HTML + screenshot + estructura del DOM).
3. **Almacena** todo en una base de datos versionada + storage de artefactos.
4. **Re-crawlea periódicamente** (cron diario) para detectar cambios.
5. Expone una **API REST** para que **otros sistemas de agentes de IA** consulten información siempre actualizada sobre cómo funciona Vidroop.

**Objetivo de negocio**: tener una base de conocimiento viva de Vidroop, de modo que si un cliente le consulta a un agente IA (ej. soporte automatizado, asistente de ventas), ese agente tenga la información actualizada de la plataforma sin que un humano la mantenga a mano.

**Decisiones tomadas con el usuario** (no re-preguntar):
- ToS de Vidroop: **riesgo asumido** por el usuario (es su propia cuenta).
- Alcance: **MVP**, no arquitectura completa de una.
- Targets: **solo Vidroop** por ahora (diseño permite escalar a otros SaaS después).
- Stack hosting: **Supabase + Vercel + GitHub** (el usuario los tiene preconfigurados con MCPs).
- Lenguaje: **TypeScript**.

---

## 2. Origen — la auditoría manual

Antes de construir esto, se hizo una **auditoría manual completa de Vidroop** navegando con Claude in Chrome. Esa auditoría es la **fuente de verdad** del dominio y vive en:

```
/Users/osvaldo/Projects/app/Analizar Vidroop/notes/
├── README.md                       (índice)
├── 00-resumen-general.md           (qué es Vidroop, stack, roles, modelo de negocio)
├── 01-arquitectura-navegacion.md   (top-bar, sidebars, mapa de las 38 rutas)
├── 02-area-academia.md
├── 03-area-gestion.md
├── 04-area-mi-cuenta.md
├── 05-area-formaciones-cursos.md
├── 06-area-productos.md
├── 07-paginas-utilitarias.md
├── 08-integraciones.md             (5 pagos, 4 autoresponders, video, tracking)
├── 09-bugs-y-hallazgos.md          (28 bugs documentados de Vidroop)
├── 10-api-endpoints.md             (endpoints de api.vidroop.com observados)
└── 11-design-knowledge-platform.md (diseño de ESTA plataforma)
```

**IMPORTANTE**: estos docs `notes/` están FUERA del repo git (`vidroop-knowledge/` es el repo; `notes/` es el directorio hermano padre). Son la base de conocimiento que más adelante el "LLM normalizer" debe reproducir automáticamente.

Datos clave de Vidroop extraídos en la auditoría:
- Frontend: **Vue 2 SPA**, router con 38 rutas (extraíbles vía `router.options.routes`).
- API: `api.vidroop.com/v1`, auth por **cookie HttpOnly** (no hay token en localStorage).
- Login: `POST /v1/usuario/login` con `{email, password}` → setea cookie.
- Roles: Alumno(0), Profesor(1), Administrador(2), Instructor(7).
- Academia auditada: slug `academiaia`, usuario `academiaia@vidroop.com` (rol profesor = owner).

---

## 3. Estado actual — qué está HECHO ✅

| Componente | Estado | Detalle |
|---|---|---|
| Proyecto Supabase | ✅ | `vidroop-knowledge`, 7 tablas + 1 enum + bucket Storage |
| Schema + migración | ✅ | `supabase/migrations/00001_initial_schema.sql` aplicada |
| Next.js app | ✅ | 14 endpoints API + 2 páginas (home + admin) |
| Cliente Supabase | ✅ | admin (service_role), server (ssr), browser |
| Cifrado credenciales | ✅ | AES-256-GCM (`src/lib/crypto/`) |
| Auth API externa | ✅ | API keys sha256 + scopes (`src/lib/auth/api-key.ts`) |
| Crawler Playwright | ✅ | `crawler/`, corre en GitHub Actions |
| Workflow GH Actions | ✅ | cron diario + repository_dispatch + manual |
| Deploy Vercel | ✅ | producción, deployment protection OFF (API pública) |
| Repo GitHub | ✅ | público |
| **Test e2e** | ✅ | **23/24 páginas crawleadas, artefactos en Storage, API sirve todo** |
| **MCP server (Etapa A)** | ✅ | **`POST /api/mcp`, Streamable HTTP stateless, 6 tools + resources, auth API key. En prod** |
| **UI pública** | ✅ | **Home/menú (`/`), explicación de Vidroop (`/vidroop`, `/vidroop/[slug]`) desde notes bundleadas. En prod** |
| **Copiloto IA** | ✅ | **`/copiloto` + `POST /api/copiloto`: Haiku 4.5 con la KB en system prompt cacheado, rate-limit por IP, markdown sanitizado. En prod** |

**El flujo completo está probado y funciona**: API dispara crawl → GitHub Actions corre Playwright → login Vidroop → recorre 24 rutas → sube HTML/PNG/DOM a Storage → inserta en BD → API sirve los artefactos con auth.

---

## 4. Recursos cloud — TODOS los IDs

### Supabase
- **Org**: `RPAosvaldo` (`vfwvocgbntsdkinqjpuj`)
- **Project**: `vidroop-knowledge` → ID `rljipcoquotezyappziy`
- **Region**: `sa-east-1`
- **URL**: `https://rljipcoquotezyappziy.supabase.co`
- **Dashboard**: https://supabase.com/dashboard/project/rljipcoquotezyappziy
- **Publishable key**: `sb_publishable__UP40hc-aWfxAM4QLX-a5g_MlJIuH1b`
- **Storage bucket**: `crawl-artifacts` (privado, límite 10MB/archivo)
- **Tablas**: `academias`, `credenciales`, `crawls`, `paginas`, `rutas`, `console_errors`, `api_keys`

### Vercel
- **Team**: `Osvaldo's projects` (`team_bT7FR9G2q2QyfduawQFPMkyR`)
- **Project**: `vidroop-knowledge` (`prj_AMG8U7cEpNCaO2du9rI6K8f1vxrG`)
- **URL producción**: https://vidroop-knowledge.vercel.app
- **Deployment protection**: DESACTIVADA (API consumible por agentes externos)
- **Env vars seteadas** (production): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, CREDENTIAL_ENCRYPTION_KEY, GITHUB_REPO_OWNER, GITHUB_REPO_NAME, GITHUB_DISPATCH_TOKEN, **ANTHROPIC_API_KEY** (copiloto; también en `.env.local`)

### GitHub
- **Repo**: https://github.com/onelx/vidroop-knowledge (público)
- **Cuenta**: `onelx`
- **Secrets seteados** (Actions): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CREDENTIAL_ENCRYPTION_KEY
- **Workflow**: `.github/workflows/crawl.yml` (cron `0 6 * * *` = 03:00 ART)

### Local
- **Path**: `/Users/osvaldo/Projects/app/Analizar Vidroop/vidroop-knowledge/`
- **Node**: v26 local / Node 22 en CI
- **Secretos locales**: `.env.local` y `.secrets.local.txt` (ambos gitignored)

---

## 5. Arquitectura + flujo

```
   Cliente API (otro agente IA)
            │  Authorization: Bearer vk_...
            ▼
   ┌──────────────────────┐         ┌──────────────────────┐
   │   Next.js en Vercel  │ ──────▶ │  Supabase Postgres   │
   │   • /api/v1/* (REST) │  read   │  + Storage           │
   │   • /admin (UI)      │ ◀────── │  (academias, crawls, │
   └──────────┬───────────┘  data   │   paginas, artefactos)│
              │                      └──────────▲───────────┘
              │ repository_dispatch              │ write
              ▼                                  │
   ┌──────────────────────┐                      │
   │  GitHub Actions       │ ─────────────────────┘
   │  Playwright crawler   │
   │  (cron + dispatch)    │ ──login──▶ academia.vidroop.com
   └──────────────────────┘
```

**Por qué el crawler está en GitHub Actions y no en Vercel**: Vercel es serverless, no puede correr Playwright (browser headless, minutos por crawl). GitHub Actions tiene Node + Chromium nativos, cron gratis, y se dispara por API vía `repository_dispatch`.

---

## 6. Estructura del código

```
vidroop-knowledge/
├── docs/
│   └── HANDOFF.md                      ← este archivo
├── src/
│   ├── app/
│   │   ├── page.tsx                    (home pública)
│   │   ├── admin/page.tsx              (panel admin — SIN auth todavía ⚠️)
│   │   └── api/
│   │       ├── mcp/route.ts             (MCP server: POST=JSON-RPC, GET=405, OPTIONS=CORS)
│   │       └── v1/
│   │           ├── health/route.ts
│   │           ├── academias/route.ts             (GET list, POST create)
│   │           ├── academias/[id]/route.ts        (GET detail)
│   │           ├── academias/[id]/credenciales/route.ts
│   │           ├── academias/[id]/crawls/route.ts (GET list, POST trigger)
│   │           ├── academias/[id]/rutas/route.ts
│   │           ├── crawls/[id]/route.ts
│   │           ├── crawls/[id]/paginas/route.ts
│   │           ├── paginas/route.ts               (search cross-crawl)
│   │           ├── paginas/[id]/route.ts
│   │           └── paginas/[id]/[artifact]/route.ts (html|screenshot|dom-tree|text)
│   └── lib/
│       ├── supabase/{admin,server,client,types}.ts
│       ├── crypto/index.ts             (AES-256-GCM)
│       ├── auth/api-key.ts             (validación + generateApiKey)
│       ├── api/utils.ts                (json, jsonError, cursor pagination)
│       ├── github/dispatch.ts          (triggerCrawlWorkflow)
│       ├── mcp/                         (MCP server — Etapa A)
│       │   ├── server.ts               (dispatcher JSON-RPC: initialize/ping/tools/resources)
│       │   ├── tools.ts                (6 tools + scope por tool)
│       │   ├── resources.ts            (artefactos vidroop://pagina/{id}/...)
│       │   └── errors.ts               (McpError con código JSON-RPC)
│       └── vidroop/routes.ts           (38 rutas conocidas)
├── crawler/                            (workspace separado, corre en CI)
│   ├── package.json
│   ├── tsconfig.json                   (module Node16, compila a dist/)
│   └── src/
│       ├── index.ts                    (crawler principal)
│       ├── routes.ts                   (24 rutas estáticas a recorrer)
│       ├── supabase.ts
│       └── crypto.ts                   (decryptCredential)
├── .github/workflows/crawl.yml
├── supabase/migrations/00001_initial_schema.sql
├── .env.local                          (secrets, gitignored)
└── .secrets.local.txt                  (API key de prueba, gitignored)
```

---

## 7. Cómo retomar — setup local

```bash
cd "/Users/osvaldo/Projects/app/Analizar Vidroop/vidroop-knowledge"

# Las env vars ya están en .env.local (gitignored). Si se perdieron, ver sección 8.

# App Next.js
npm install
npm run dev            # http://localhost:3000
npm run build          # validar build de producción
npx next typegen       # regenerar tipos de rutas si agregás endpoints

# Crawler
cd crawler
npm install
npm run build          # tsc → dist/  (OBLIGATORIO: no usar tsx, ver bug #3)
# correr local (necesita las env vars del crawler):
CRAWL_ID=... ACADEMIA_ID=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  CREDENTIAL_ENCRYPTION_KEY=... node dist/index.js
```

### Comandos útiles

```bash
# Disparar un crawl vía API
curl -X POST "https://vidroop-knowledge.vercel.app/api/v1/academias/{ACADEMIA_ID}/crawls" \
  -H "Authorization: Bearer {API_KEY}"

# Ver workflows
gh run list --repo onelx/vidroop-knowledge --limit 5
gh run view {RUN_ID} --repo onelx/vidroop-knowledge --log-failed

# Deploy manual (también auto-deploya en cada push a main)
vercel --prod --yes

# Setear/actualizar env var en Vercel
echo "valor" | vercel env add NOMBRE production --force
```

---

## 8. Secretos — dónde están

| Secreto | Ubicación |
|---|---|
| API key de prueba (`vk_...`) | `.secrets.local.txt` + chat sesión 2026-05-27 |
| Supabase publishable key | `.env.local` (no es secreto, va al cliente) |
| Supabase service_role | `.env.local` + Vercel env + GitHub secret. Recuperable del dashboard Supabase → Settings → API keys |
| Encryption key (AES) | `.env.local` + `/tmp/vidroop-knowledge-enc-key.txt` + Vercel env + GitHub secret. **Si se pierde, las credenciales cifradas en BD son irrecuperables** |
| GitHub dispatch token | `.env.local` + Vercel env. Es `gh auth token` |

**Para crear una nueva API key** (script ad-hoc):
```js
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
const supa = createClient(URL, SERVICE_ROLE_KEY, {auth:{persistSession:false}});
const plain = 'vk_' + crypto.randomBytes(20).toString('base64url');
const hash = crypto.createHash('sha256').update(plain).digest('hex');
await supa.from('api_keys').insert({ key_hash: hash, prefix: plain.slice(0,8), label: 'mi-key', scopes: ['read:academias','read:crawls','trigger:crawl','read:paginas','read:routes','read:credentials','write:academias','write:credentials'] });
console.log(plain); // se muestra UNA vez
```

---

## 9. Datos persistidos (del test e2e)

| Recurso | ID |
|---|---|
| Academia "Academia IA" (slug `academiaia`) | `132cca06-154e-43e7-b1ac-66a10e43ed51` |
| Credencial (academiaia@vidroop.com, cifrada) | `8bc9562f-47c4-42da-8ded-12247a8b8ce8` |
| Crawl exitoso (partial 23/24) | `22c9ab5f-e8ab-45ec-9385-fa92f0b2a4bf` |
| API key activa (label `mvp-test-key`) | prefix `vk_8Ueq` |

(También quedaron 3 crawls `failed` de los intentos previos — se pueden borrar.)

---

## 10. Bugs resueltos durante el build (para no repetirlos)

| # | Síntoma | Causa | Fix |
|---|---|---|---|
| 1 | Workflow falla en setup-node | falta `crawler/package-lock.json` | commitear el lockfile |
| 2 | `Node 20 missing WebSocket` | Supabase SDK necesita WebSocket nativo | Node 22 en el workflow |
| 3 | `ReferenceError: __name` en page.evaluate | tsx inyecta helpers al serializar funciones al browser | compilar con `tsc` y correr `node dist/index.js` (NO usar tsx) |
| 4 | `page.accessibility` no existe | removido en Playwright 1.48+ | DOM snapshot custom con page.evaluate |
| 5 | API devolvía 401 público | Vercel deployment protection ON por default | PATCH `/v9/projects/{id}` con `ssoProtection:null` |

---

## 11. Deuda técnica / cosas a saber ⚠️

1. **`/admin` está SIN autenticación** — expuesta públicamente. Antes de meter datos reales sensibles, agregar Supabase Auth + RLS policies. Las tablas tienen RLS habilitado pero sin policies → solo `service_role` accede (la API usa service_role, por eso funciona).
2. **El crawler solo recorre rutas estáticas** (24). Las dinámicas (`/curso/:id`, `/producto/:id`) necesitan seed con UUIDs reales. En la auditoría manual eso se hizo creando data de prueba y borrándola.
3. **No hay "explorer agent"** — el crawler determinista no descubre modales/forms detrás de clicks (ej. "Crear Producto" abre un modal que no se ve por URL). La auditoría manual sí los documentó.
4. **`/actualizar-licencia` siempre falla** (timeout) porque redirige a `/gestion/pagos-vidroop/plan-suscrito`. Se puede quitar del seed o aumentar timeout / manejar redirects.
5. **El cron procesa TODAS las academias activas** en serie (loop bash en el workflow). Con muchas academias esto puede pasar el timeout de 30min del job. Habría que paralelizar o usar matrix.
6. **3 secrets duplicados** entre Vercel y GitHub (service_role, enc key). Si rotás uno, rotar en ambos lados.
7. **Costo Supabase**: el proyecto suma **$10/mes** a la org (es Pro).
8. **Explicación/copiloto salen de notes BUNDLEADAS, no de la DB.** `notes/00-10` se empaquetan en `src/content/vidroop/data.ts` vía `scripts/gen-vidroop-content.mjs` (re-correr si cambian las notes). Se eligió así porque **no se pudo aplicar DDL**: el MCP de Supabase estuvo caído (`net::ERR_FAILED`, sin egress) y no había connection string ni DB password a mano. La migración `00002_documentos.sql` + `scripts/seed-documentos.mjs` quedaron listas para cuando se destrabe (MCP o credencial) — las necesita el **normalizer (Etapa B)** para escribir docs generados. PostgREST con service_role SÍ funciona desde afuera (lectura/escritura de datos), solo el DDL está bloqueado.
9. **Copiloto = costo por consulta.** Público con rate-limit best-effort por IP (in-memory, no global en serverless) + `max_tokens` 2048 + historial acotado. La KB (~32k tok) va cacheada (prompt caching, TTL 5min) → barata en consultas repetidas. Si rotás `ANTHROPIC_API_KEY`, actualizá Vercel + `.env.local`.

---

## 12. PRÓXIMA SESIÓN — plan detallado

Orden sugerido por valor/dependencia. Cada ítem es un "entregable" cerrable.

### Etapa A — MCP Server ✅ HECHO (2026-05-28)
Server MCP en `POST /api/mcp` (Streamable HTTP, **stateless**, JSON-RPC 2.0, sin deps nuevas — hand-rolled para no arrastrar `mcp-handler`+redis y respetar el estilo Web `Response`/`requireApiKey` del repo).
- **Tools** (cada una valida su scope de API key, igual que la REST):
  - `list_academias` (`read:academias`) — punto de entrada, da los `academia_id`.
  - `search_paginas` (`read:paginas`) — busca por texto (path/título), academia y/o path.
  - `get_pagina` (`read:paginas`) — metadatos + URIs de recursos (no incluye el texto crudo).
  - `list_rutas` (`read:routes`) — mapa de rutas de una academia.
  - `get_crawl_status` (`read:crawls`) — por `crawl_id` o último de una `academia_id`.
  - `trigger_crawl` (`trigger:crawl`) — encola crawl vía GitHub Actions.
- **Resources** (templates): `vidroop://pagina/{id}/{text|html|dom-tree|screenshot}`. text→DB, resto→Storage; screenshot como blob base64.
- Auth: `Authorization: Bearer vk_...` (mismas keys). `initialize`/`tools-list` solo requieren key válida; `tools/call` y `resources/read` chequean scope.
- Probado local (initialize, tools/list, tools/call de las 6, resources/read text+screenshot, 401, batch, 405 GET, 204 OPTIONS, errores -32601/-32602).
- **PENDIENTE**: `git push` a main → auto-deploy Vercel; luego conectar un cliente MCP real (Claude Desktop / agente) apuntando a `https://vidroop-knowledge.vercel.app/api/mcp` con header `Authorization: Bearer vk_...`.

Probar el MCP local:
```bash
curl -s -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer $VK_KEY" -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Etapa B — LLM Normalizer
Hoy guardamos HTML+screenshot+DOM crudos. Falta convertirlos en **docs estructurados tipo `notes/02-area-academia.md`**.
- Job que toma una `pagina`, manda HTML+screenshot a Claude (Anthropic SDK, con prompt caching), y emite markdown estructurado (campos, validaciones, copy).
- Guardar en nueva tabla `documentos` o columna en `paginas`.
- Esto es lo que hace la KB realmente útil para los agentes.

### Etapa C — Búsqueda semántica
- Agregar extensión `pgvector` a Supabase.
- Generar embeddings de cada doc/página (Anthropic o OpenAI embeddings).
- Endpoint `GET /api/v1/search?q=...&academia_id=...` con vector search.

### Etapa D — Diff engine + alertas
- Comparar el último crawl vs el anterior por ruta (text diff + diff semántico con LLM).
- Tabla `cambios`. Endpoint `GET /api/v1/academias/:id/cambios`.
- Notificación Telegram/Slack cuando hay cambios significativos (nueva ruta, campo nuevo, copy cambiado).

### Etapa E — Auth en /admin + UI completa
- Supabase Auth (magic link) + RLS policies para `authenticated`.
- UI para: registrar academia + creds (form), ver crawls, ver diffs, ver páginas con preview de screenshot, gestionar API keys.

### Etapa F — Explorer agent
- Un agente (Playwright + Claude) que navega como hicimos manualmente: hace clicks, abre modales, documenta lo que el crawler determinista no ve.
- Más caro pero captura el 100%.

### Etapa G — Multi-target
- Generalizar: `target_adapter` por SaaS. Hoy todo asume Vidroop (login selector, router extraction). Abstraer para apuntar a otros.

---

## 13. Quickstart para la próxima sesión

```
1. Leé este HANDOFF.md entero.
2. Leé notes/11-design-knowledge-platform.md (diseño) y notes/00..10 (dominio Vidroop).
3. Verificá que sigue vivo:
   curl https://vidroop-knowledge.vercel.app/api/v1/health
4. Recuperá la API key de .secrets.local.txt
5. Elegí etapa de la sección 12 (A ya está hecha; recomendado seguir con B — LLM Normalizer).
6. cd vidroop-knowledge && npm install && npm run dev
```

**Contexto de una línea**: plataforma que crawlea Vidroop a una BD y la expone por REST + MCP para agentes IA; MVP en prod (Vercel+Supabase+GH Actions); Etapa A (MCP) hecha, falta deploy; próxima etapa = LLM normalizer.
