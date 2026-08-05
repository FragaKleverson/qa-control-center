-- Migration: create_audit_log_table
-- Fase 3, Item 9 — Audit Log.
-- Registra quem alterou, o quê e quando em projetos, suites, requirements e execucoes.

CREATE TABLE audit_logs (
  id          SERIAL       PRIMARY KEY,
  user_id     INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(50)  NOT NULL,
  entity_id   INTEGER,
  action      VARCHAR(20)  NOT NULL,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user   ON audit_logs(user_id);
CREATE INDEX idx_audit_time   ON audit_logs(created_at DESC);
