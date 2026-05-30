-- 00004_change_detection.sql
-- Detección de cambios en el crawler.
-- El crawler recorre TODAS las rutas en cada corrida, pero solo sube artefactos
-- (HTML/screenshot/DOM) cuando el contenido de una ruta cambió respecto al último
-- crawl. Las rutas sin cambios guardan una fila liviana (hash + changed=false) que
-- reusa los paths de artefactos de la captura previa.

-- Hash del contenido normalizado (sha256 hex) usado para comparar contra la captura anterior.
alter table public.paginas
  add column if not exists content_hash text;

-- true  = el contenido cambió respecto al último crawl (artefactos nuevos subidos)
-- false = sin cambios; los *_path apuntan a los artefactos de la captura previa
alter table public.paginas
  add column if not exists changed boolean not null default true;

-- Lookup del hash previo: por ruta, la captura más reciente con hash.
create index if not exists paginas_path_captured_idx
  on public.paginas (path, captured_at desc);

-- Contadores por crawl: cuántas rutas cambiaron / quedaron iguales.
alter table public.crawls
  add column if not exists pages_changed integer not null default 0;

alter table public.crawls
  add column if not exists pages_unchanged integer not null default 0;
