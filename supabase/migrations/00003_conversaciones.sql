-- Historial de conversaciones del copiloto.
-- session_id generado en el cliente (crypto.randomUUID), guardado en localStorage.
-- messages guarda el array completo [{role, content}] después de cada turno.
-- ip_hash: SHA-256 del IP para análisis sin guardar el IP real.

CREATE TABLE IF NOT EXISTS conversaciones (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT        NOT NULL,
  messages   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  ip_hash    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversaciones_session_id
  ON conversaciones (session_id);

CREATE INDEX IF NOT EXISTS idx_conversaciones_updated_at
  ON conversaciones (updated_at DESC);

ALTER TABLE conversaciones ENABLE ROW LEVEL SECURITY;
