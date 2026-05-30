-- 00005_cancel_crawl.sql
-- Permite cancelar un crawl en curso desde el panel admin.

-- Nuevo estado terminal para crawls detenidos manualmente.
alter type crawl_status add value if not exists 'cancelled';

-- ID de la corrida de GitHub Actions asociada al crawl, para poder cancelarla.
-- El crawler lo escribe al arrancar (env GITHUB_RUN_ID).
alter table public.crawls
  add column if not exists gh_run_id bigint;
