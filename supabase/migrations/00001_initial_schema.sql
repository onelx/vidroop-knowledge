-- =====================================================================
-- Vidroop Knowledge — Initial Schema
-- Plataforma para crawlear, almacenar y exponer documentación de
-- academias Vidroop. Diseñado para Supabase (Postgres 17 + RLS).
-- =====================================================================

-- pgcrypto para gen_random_uuid (built-in en Postgres 13+)
create extension if not exists "pgcrypto";

-- =====================================================================
-- ACADEMIAS — targets a crawlear
-- =====================================================================
create table public.academias (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  label           text not null,
  base_url        text not null,
  api_base_url    text not null,
  storefront_url  text,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index academias_slug_idx on public.academias(slug);

-- =====================================================================
-- CREDENCIALES — para auth contra la academia
-- password_encrypted: AES-256-GCM cifrado server-side. Bytes = iv|tag|ct
-- =====================================================================
create table public.credenciales (
  id                  uuid primary key default gen_random_uuid(),
  academia_id         uuid not null references public.academias(id) on delete cascade,
  email               text not null,
  password_encrypted  bytea not null,
  role                text,
  label               text,
  last_used_at        timestamptz,
  created_at          timestamptz not null default now()
);

create index credenciales_academia_idx on public.credenciales(academia_id);

-- =====================================================================
-- CRAWLS — cada ejecución del scraper
-- =====================================================================
create type crawl_status as enum ('pending', 'running', 'completed', 'failed', 'partial');

create table public.crawls (
  id              uuid primary key default gen_random_uuid(),
  academia_id     uuid not null references public.academias(id) on delete cascade,
  status          crawl_status not null default 'pending',
  trigger         text not null,                          -- "cron" | "manual" | "api"
  triggered_by    text,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  duration_ms     integer,
  pages_total     integer not null default 0,
  pages_success   integer not null default 0,
  pages_failed    integer not null default 0,
  error_message   text,
  error_stack     text,
  metadata        jsonb
);

create index crawls_academia_started_idx on public.crawls(academia_id, started_at desc);
create index crawls_status_idx on public.crawls(status);

-- =====================================================================
-- PAGINAS — captura por página visitada
-- =====================================================================
create table public.paginas (
  id              uuid primary key default gen_random_uuid(),
  crawl_id        uuid not null references public.crawls(id) on delete cascade,
  path            text not null,
  full_url        text not null,
  route_name      text,
  title           text,
  http_status     integer not null,
  html_path       text,
  screenshot_path text,
  dom_tree_path   text,
  text_content    text,
  duration_ms     integer,
  captured_at     timestamptz not null default now(),
  links_count     integer not null default 0,
  forms_count     integer not null default 0,
  error_message   text
);

create index paginas_crawl_idx on public.paginas(crawl_id);
create index paginas_path_idx on public.paginas(path);

-- =====================================================================
-- RUTAS — catálogo extraído del Vue router (estado actual)
-- =====================================================================
create table public.rutas (
  id                  uuid primary key default gen_random_uuid(),
  academia_id         uuid not null references public.academias(id) on delete cascade,
  path_pattern        text not null,
  route_name          text not null,
  is_dynamic          boolean not null,
  meta                jsonb,
  first_seen_at       timestamptz not null default now(),
  last_seen_at        timestamptz not null default now(),
  last_seen_crawl_id  uuid references public.crawls(id),
  unique (academia_id, path_pattern)
);

create index rutas_academia_idx on public.rutas(academia_id);

-- =====================================================================
-- CONSOLE_ERRORS — errores JS detectados durante crawl
-- =====================================================================
create table public.console_errors (
  id          uuid primary key default gen_random_uuid(),
  crawl_id    uuid not null references public.crawls(id) on delete cascade,
  pagina_id   uuid references public.paginas(id) on delete cascade,
  level       text not null,                              -- "error" | "warning" | "exception"
  message     text not null,
  source      text,
  captured_at timestamptz not null default now()
);

create index console_errors_crawl_idx on public.console_errors(crawl_id);

-- =====================================================================
-- API_KEYS — para que agentes IA externos consuman la API
-- =====================================================================
create table public.api_keys (
  id            uuid primary key default gen_random_uuid(),
  key_hash      text not null unique,                     -- sha256 hash
  prefix        text not null,                            -- primeros 8 chars para UI
  label         text not null,
  scopes        text[] not null default '{}',
  created_at    timestamptz not null default now(),
  expires_at    timestamptz,
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

create index api_keys_hash_idx on public.api_keys(key_hash);

-- =====================================================================
-- TRIGGERS — updated_at automático
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger academias_set_updated_at
  before update on public.academias
  for each row execute function public.set_updated_at();

-- =====================================================================
-- RLS — Row Level Security
-- Por ahora restrictivo: solo el service_role accede.
-- Más adelante, cuando agreguemos Supabase Auth, abrimos a usuarios autenticados.
-- =====================================================================
alter table public.academias       enable row level security;
alter table public.credenciales    enable row level security;
alter table public.crawls          enable row level security;
alter table public.paginas         enable row level security;
alter table public.rutas           enable row level security;
alter table public.console_errors  enable row level security;
alter table public.api_keys        enable row level security;

-- Sin policies = nadie puede leer/escribir excepto service_role (que bypassea RLS).
-- Esto significa que la API de Next.js debe usar el service_role key.
-- Cuando agreguemos UI con magic-link auth, agregamos policies para authenticated.
