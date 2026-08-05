-- Migration: add_soft_delete
-- Fase 3, Item 10 — Soft Delete.
-- Adiciona deleted_at nas entidades principais.
-- DELETE passa a ser UPDATE SET deleted_at = NOW(); listas filtram deleted_at IS NULL.

ALTER TABLE projetos     ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE test_suites  ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE requirements ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE test_plans   ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE execucoes    ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX idx_projetos_deleted_at     ON projetos(deleted_at);
CREATE INDEX idx_test_suites_deleted_at  ON test_suites(deleted_at);
CREATE INDEX idx_requirements_deleted_at ON requirements(deleted_at);
CREATE INDEX idx_test_plans_deleted_at   ON test_plans(deleted_at);
CREATE INDEX idx_execucoes_deleted_at    ON execucoes(deleted_at);
