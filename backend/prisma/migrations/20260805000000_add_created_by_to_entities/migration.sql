-- Migration: add_created_by_to_entities
-- Fase 3, Item 8 — Relacionamentos de Usuários.
-- Adiciona created_by (FK → users) em projetos, test_suites, requirements e execucoes.
-- Nullable para não quebrar registros existentes; ON DELETE SET NULL preserva dados
-- quando um usuário é removido.

ALTER TABLE projetos
  ADD COLUMN created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE test_suites
  ADD COLUMN created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE requirements
  ADD COLUMN created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE execucoes
  ADD COLUMN created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
