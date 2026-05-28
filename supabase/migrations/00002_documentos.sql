-- =====================================================================
-- Vidroop Knowledge — Documentos (conocimiento estructurado)
-- Docs en markdown que explican cómo funciona Vidroop. Dos fuentes:
--   'notes'      → auditoría humana sembrada desde notes/*.md (calidad alta)
--   'normalizer' → generados por LLM desde el crawl (HTML + screenshot)
-- Sirven a: página de explicación, contexto del copiloto, y futura
-- búsqueda semántica (Etapa C: se le agregará una columna embedding).
-- =====================================================================

create table public.documentos (
  id           uuid primary key default gen_random_uuid(),
  academia_id  uuid not null references public.academias(id) on delete cascade,
  source       text not null default 'notes' check (source in ('notes', 'normalizer')),
  slug         text not null,                                    -- ej. '02-area-academia'
  titulo       text not null,
  area         text,                                             -- ej. 'Academia', 'Gestión'
  source_path  text,                                             -- 'notes/02-area-academia.md' o null
  pagina_id    uuid references public.paginas(id) on delete set null, -- docs por-página del normalizer
  crawl_id     uuid references public.crawls(id) on delete set null,  -- crawl de origen (normalizer)
  content_md   text not null,                                    -- cuerpo markdown
  orden        int not null default 0,                           -- para ordenar en el menú
  tokens       int,                                              -- conteo aprox (copiloto / caching)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (academia_id, source, slug)
);

create index documentos_academia_idx on public.documentos(academia_id);
create index documentos_source_idx on public.documentos(academia_id, source, orden);

-- RLS habilitado sin policies: solo service_role accede (igual que el resto del schema).
alter table public.documentos enable row level security;
