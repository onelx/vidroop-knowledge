# Vidroop Knowledge Platform

Plataforma que crawlea automáticamente Vidroop (academia online SaaS), almacena toda la documentación del producto en una base de datos versionada, y expone una API para que agentes de IA externos consulten información siempre actualizada.

## Arquitectura

```
                          ┌────────────────────┐
                          │  GitHub Actions     │
                          │  (cron diario)      │  ──┐
                          │  Playwright crawler │    │
                          └─────────┬──────────┘    │
                                    │ writes        │ artefactos
                                    ▼                ▼
                          ┌────────────────────┐  ┌──────────────────┐
                          │  Supabase Postgres │  │  Supabase Storage │
                          │  (academias, etc.) │  │  (HTML, PNG, JSON)│
                          └─────────┬──────────┘  └────────┬─────────┘
                                    │                       │
                                    │ read                  │
                                    ▼                       │
   API externa     ◀──────  ┌────────────────────┐  ◀──────┘
   (otros agentes IA)        │  Next.js en Vercel  │
                             │  • /v1/* (REST API)  │
                             │  • /admin (UI)       │
                             └────────────────────┘
```

## Stack

| Capa | Tech | Hosting |
|---|---|---|
| Source control | git | GitHub (`onelx/vidroop-knowledge`) |
| DB | Postgres 17 | Supabase (sa-east-1) |
| Storage | S3-compat | Supabase Storage |
| Crawler | Playwright (TS) | GitHub Actions (cron) |
| API + UI | Next.js 15 | Vercel |
| Auth UI | Supabase Auth | Supabase |
| Auth API | API keys (sha256) | tabla `api_keys` |

## Estructura del repo

```
vidroop-knowledge/
├── src/                       # Next.js app
│   ├── app/
│   │   ├── (admin)/           # UI admin
│   │   └── api/v1/            # REST API
│   └── lib/
│       ├── supabase/          # clients
│       ├── crypto/            # AES-256-GCM
│       └── auth/              # API key middleware
├── crawler/                   # Workspace del crawler (corre en GH Actions)
│   └── src/
├── .github/workflows/
│   └── crawl.yml              # cron + workflow_dispatch
├── supabase/
│   └── migrations/
└── docs/                      # docs de la plataforma
```

## Cómo correr local

```bash
# 1. Copiar env y completar valores
cp .env.example .env.local

# 2. Instalar deps
npm install

# 3. Aplicar migraciones a Supabase (vía MCP o supabase-cli)

# 4. Levantar dev server
npm run dev
```

## Variables de entorno

Ver [`.env.example`](.env.example).

## Endpoints API

Ver [docs/api.md](docs/api.md).

## Disparar un crawl manual

Tres formas:
1. Desde la UI admin (botón en /admin/academias/{id})
2. Via API: `POST /v1/academias/{id}/crawls` con `Authorization: Bearer vk_...`
3. Via GitHub Actions UI: ir a Actions → "Crawl Vidroop" → Run workflow
